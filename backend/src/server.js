/**
 * server.js
 * A minimal Express API that:
 * 1) validates input
 * 2) calls external APIs (geocode + weather)
 * 3) builds a trip plan JSON
 * 4) saves it to Postgres using Prisma
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware } from "./middleware/auth.js";


dotenv.config(); // Loads .env into process.env

const { PrismaClient } = pkg;
const app = express();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });


// Allow requests from your React dev server
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools like curl/Postman (no Origin header)
      if (!origin) return callback(null, true);

      // Allow any localhost port (http://localhost:5175 etc.)
      if (origin.startsWith("http://localhost:")) return callback(null, true);

      // Block everything else
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Parses JSON bodies automatically (req.body becomes an object)
app.use(express.json());

/**
 * GET /api/health
 * A quick “is the server running?” endpoint.
 */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "trip-planner-api" });
});

/**
 * Zod schema = input validation.
 * This prevents garbage data from reaching your logic/database.
 */
const PlanTripSchema = z.object({
  
  destination: z.string().min(2),
  startDate: z.string().min(8), // ISO date string like "2026-02-10"
  endDate: z.string().min(8),
  budget: z.number().int().positive(),
  vibe: z.enum(["techno", "nature", "relax", "food", "mixed"]),
});


/**
 * requireTripOwner()
 * WHY:
 * - Every "trip detail" or "trip update" endpoint needs to verify ownership
 * - This function centralizes the logic so you don’t copy-paste
 *
 * WHAT it does:
 * - Finds the trip by ID
 * - If not found -> 404
 * - If trip belongs to another user -> 403
 * - If OK -> returns the trip object
 */
async function requireTripOwner({ prisma, tripId, userId }) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    const err = new Error("Trip not found");
    err.status = 404;
    throw err;
  }

  if (trip.userId !== userId) {
    const err = new Error("Forbidden: not your trip");
    err.status = 403;
    throw err;
  }

  return trip;
}



/**
 * Helper: Call Open-Meteo geocoding API
 * Why? Most travel APIs need lat/lon. Users type "Amsterdam", we convert it.
 */
async function geocodeCity(destination) {
  // encodeURIComponent makes the string URL-safe
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    destination
  )}&count=1&language=en&format=json`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Geocoding failed with status ${resp.status}`);
  }

  const data = await resp.json();

  // The API returns { results: [...] } or nothing if not found
  const top = data?.results?.[0];
  if (!top) return null;

  // Return normalized data your app understands
  return {
    name: top.name,
    country: top.country,
    latitude: top.latitude,
    longitude: top.longitude,
    timezone: top.timezone,
  };
}

/**
 * Helper: Call Open-Meteo forecast API
 * Why? Adds useful trip context (temp/rain).
 */
async function fetchWeather(latitude, longitude, timezone) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=${encodeURIComponent(
    timezone || "auto"
  )}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Weather failed with status ${resp.status}`);
  }

  const data = await resp.json();

  // We’ll just grab daily forecast arrays for now
  return {
    time: data?.daily?.time || [],
    tempMax: data?.daily?.temperature_2m_max || [],
    tempMin: data?.daily?.temperature_2m_min || [],
    precipitation: data?.daily?.precipitation_sum || [],
  };
}

/**
 * POST /api/trips/plan
 * Main MVP endpoint. In “real life”, this is your orchestration service.
 */
app.post("/api/trips/plan", authMiddleware, async (req, res) => {
  try {
    // 1) Validate input safely
    const parsed = PlanTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsed.error.flatten(),
      });
    }
    // Get the logged-in user's ID from JWT middleware
    
    const userId = req.user.id;


    const { destination, startDate, endDate, budget, vibe } = parsed.data;

    // 2) Convert destination -> lat/lon (geocoding)
    const geo = await geocodeCity(destination);

    // If city isn’t found, return a helpful error
    if (!geo) {
      return res.status(404).json({
        error: "Destination not found",
        message: `Could not find coordinates for "${destination}". Try a bigger city name.`,
      });
    }

    // 3) Fetch weather using the coordinates
    const weather = await fetchWeather(geo.latitude, geo.longitude, geo.timezone);

    // 4) Fetch places around the destination
    // We'll grab two “buckets”: restaurants + attractions
    // Geoapify uses category keys in `categories=` :contentReference[oaicite:8]{index=8}
    // Here are reasonable defaults (we can tune later):
    const restaurants = await fetchPlaces({
      lon: geo.longitude,
      lat: geo.latitude,
    radiusMeters: 5000, // 5 km
    categories: "catering.restaurant,catering.cafe",
    limit: 12,
    });

    const attractions = await fetchPlaces({
        lon: geo.longitude,
        lat: geo.latitude,
    radiusMeters: 8000, // 8 km
    categories: "tourism.attraction,tourism.sights",
    limit: 12,
    });



    // 5) Build a plan JSON object
    // This is the “product” of your orchestration logic.
    const planJson = {
      destination: {
        query: destination, // what user typed
        resolved: `${geo.name}, ${geo.country}`, // what API resolved it to
        latitude: geo.latitude,
        longitude: geo.longitude,
        timezone: geo.timezone,
      },
      trip: {
        startDate,
        endDate,
        budget,
        vibe,
      },
      weather: {
        // For MVP we just attach forecast arrays
        daily: weather,
      },
        places: {
        restaurants,
        attractions,
      },

      summary: `A ${vibe} trip to ${geo.name} within $${budget}. Includes weather + nearby places (MVP).`,
        nextIdeas: [
            "Add Place Details endpoint (click a place card → details)",
            "Add caching (Redis) so repeated searches are fast",
            "Add pagination + category filters in UI",
        ],
};

    // 5) Save trip to DB
    const trip = await prisma.trip.create({
      data: {
        title: `${geo.name} trip`,
        destination: geo.name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budget,
        vibe,
        planJson,
        user: { connect: { id: userId } },
      },
    });

    // 6) Return created record
    return res.status(201).json(trip);
  } catch (err) {
    // Catch unexpected errors (API downtime, coding bug, etc.)
    console.error(err);
    return res.status(500).json({
      error: "Server error",
      message: err.message || "Unknown error",
    });
  }
});

/**
 * GET /api/trips/:id
 * Fetch one trip from the database (useful for “shareable link” later)
 */
/**
 * GET /api/trips/:id
 * WHY:
 * - Trip detail page needs one trip
 * - Must ensure user only sees their own trips
 */
app.get("/api/trips/:id", authMiddleware, async (req, res) => {
  try {
    const tripId = req.params.id;
    const userId = req.user.id;

    // Ownership check (throws 404/403 if not allowed)
    const trip = await requireTripOwner({ prisma, tripId, userId });

    // Return trip (optionally select fields)
    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.status ? err.message : "Server error",
      message: err.status ? undefined : err.message,
    });
  }
});


// GET /api/trips?userId=...
// Returns all trips for a user (newest first)
app.get("/api/trips", authMiddleware, async (req, res) => {
  try {
    // userId is derived from the JWT token (NOT from query params)
    const userId = req.user.id;

    const trips = await prisma.trip.findMany({
      where: { userId }, // userId is already a string (Prisma schema)
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        destination: true,
        startDate: true,
        endDate: true,
        budget: true,
        vibe: true,
        createdAt: true,
      },
    });

    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});




async function fetchPlaces({ lon, lat, radiusMeters, categories, limit = 10 }) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  // Guard: fail early if key is missing (common beginner issue)
  if (!apiKey) {
    throw new Error("Missing GEOAPIFY_API_KEY in backend/.env");
  }

  // Geoapify expects circle filter in format:
  // filter=circle:LON,LAT,RADIUS
  // (Docs + tutorial show circle filter usage) :contentReference[oaicite:5]{index=5}
  const url =
    `https://api.geoapify.com/v2/places` +
    `?categories=${encodeURIComponent(categories)}` +
    `&filter=circle:${lon},${lat},${radiusMeters}` +
    `&limit=${limit}` +
    `&apiKey=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Geoapify Places failed with status ${resp.status}`);
  }

  const data = await resp.json();

  // Geoapify returns a GeoJSON FeatureCollection :contentReference[oaicite:6]{index=6}
  // We'll normalize each feature into our own clean format.
  const features = data?.features ?? [];

  return features.map((f) => {
    const p = f.properties || {};
    const coords = f.geometry?.coordinates || []; // [lon, lat]

    return {
      placeId: p.place_id, // can be used with Place Details API later
      name: p.name || p.address_line1 || "Unknown place",
      categories: p.categories || [],
      addressLine1: p.address_line1 || "",
      addressLine2: p.address_line2 || "",
      city: p.city || "",
      country: p.country || "",
      distanceMeters: p.distance ?? null, // distance available when bias/filter used :contentReference[oaicite:7]{index=7}
      location: {
        lon: coords[0],
        lat: coords[1],
      },
      website: p.website || null,
      openingHours: p.opening_hours || null,
    };
  });
}

/**
 * PATCH /api/trips/:id/itinerary
 * Adds a place to a specific day in the itinerary
 */
app.patch("/api/trips/:id/itinerary", authMiddleware, async (req, res) => {
  try {
    const tripId = req.params.id;
    const userId = req.user.id;
    const { day, place } = req.body;

    if (!day || !place) {
      return res.status(400).json({ error: "Missing day or place" });
    }

    const trip = await requireTripOwner({ prisma, tripId, userId });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const planJson = trip.planJson || {};

    // Initialize itinerary if missing
    if (!planJson.itinerary) {
      planJson.itinerary = {
        day1: [],
        day2: [],
        day3: [],
      };
    }

    if (!planJson.itinerary[day]) {
      return res.status(400).json({ error: "Invalid day" });
    }

    // Add place to selected day
    planJson.itinerary[day].push(place);

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { planJson },
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});


/**
 * PATCH /api/trips/:id/itinerary/remove
 *
 * WHY PATCH and not DELETE?
 * - We are not deleting the entire trip resource
 * - We are modifying a nested JSON field inside the trip (planJson.itinerary)
 *
 * WHAT it does:
 * - Removes ONE place from a selected day array
 *
 * Body:
 * { day: "day1" | "day2" | "day3", placeId?: string, name?: string }
 *
 * NOTE:
 * - Geoapify sometimes provides placeId; if missing, we fallback to name.
 * - In real apps, you'd always keep a stable id.
 */
app.patch("/api/trips/:id/itinerary/remove", authMiddleware, async (req, res) => {
  try {
    const tripId = req.params.id;
    const userId = req.user.id;
    const { day, placeId, name } = req.body;

    // Basic validation: need day + something to identify the item
    if (!day || (!placeId && !name)) {
      return res.status(400).json({
        error: "Missing day and identifier (placeId or name)",
      });
    }

    const trip = await requireTripOwner({ prisma, tripId, userId });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const planJson = trip.planJson || {};

    // If itinerary doesn't exist, nothing to remove
    if (!planJson.itinerary) {
      return res.status(400).json({ error: "No itinerary exists on this trip" });
    }

    // Validate day key
    if (!planJson.itinerary[day]) {
      return res.status(400).json({ error: "Invalid day" });
    }

    // Remove logic:
    // - If placeId exists, remove by placeId
    // - Else remove by name (fallback)
    planJson.itinerary[day] = planJson.itinerary[day].filter((p) => {
      if (placeId) return p.placeId !== placeId;
      return p.name !== name;
    });

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: { planJson },
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});


/**
 * DELETE /api/trips/:id
 * WHY:
 * - Completes CRUD
 * - Portfolio looks more real
 */
app.delete("/api/trips/:id", authMiddleware, async (req, res) => {
  try {
    const tripId = req.params.id;
    const userId = req.user.id;

    // Ownership check
    await requireTripOwner({ prisma, tripId, userId });

    await prisma.trip.delete({ where: { id: tripId } });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.status ? err.message : "Server error",
      message: err.status ? undefined : err.message,
    });
  }
});



/**
 * POST /api/auth/register
 * WHY:
 * - Create a new user in DB
 * - Hash their password (never store raw)
 * - Return a JWT token so they are "logged in" immediately
 */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate minimal inputs
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: String(email) },
    });

    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Hash the password (bcrypt is slow on purpose for security)
    const passwordHash = await bcrypt.hash(String(password), 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: String(email),
        password: passwordHash,
        name: name ? String(name) : null,
      },
      select: { id: true, email: true, name: true },
    });

    // Create token payload (keep it small)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // dev-friendly
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

/**
 * POST /api/auth/login
 * WHY:
 * - Verify email/password
 * - Return a token if valid
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: String(email) },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare password with hashed password in DB
    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Issue token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

/**
 * GET /api/auth/me
 * WHY:
 * - Frontend can ask "who am I?" using token
 * - Used on app load to keep user logged in
 */
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    // req.user comes from authMiddleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});


// Start the server
const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
