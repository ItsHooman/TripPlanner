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

dotenv.config(); // Loads .env into process.env

const { PrismaClient } = pkg;
const app = express();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });


// Allow requests from your React dev server
app.use(cors({ origin: "http://localhost:5173" }));

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
  userId: z.string().min(1),
  destination: z.string().min(2),
  startDate: z.string().min(8), // ISO date string like "2026-02-10"
  endDate: z.string().min(8),
  budget: z.number().int().positive(),
  vibe: z.enum(["techno", "nature", "relax", "food", "mixed"]),
});

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
app.post("/api/trips/plan", async (req, res) => {
  try {
    // 1) Validate input safely
    const parsed = PlanTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid input",
        details: parsed.error.flatten(),
      });
    }

    const { userId, destination, startDate, endDate, budget, vibe } = parsed.data;

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
app.get("/api/trips/:id", async (req, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
  });

  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  res.json(trip);
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

// Start the server
const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
