import { useState } from "react";
import { planTrip } from "../api/trips";


/**
 * savePlaceToTrip()
 * WHY this exists:
 * - This is a "backend call function"
 * - It sends a PATCH request to your Express API to update ONE trip
 * - We keep this outside the component because it does not need React state
 *
 * WHAT it does:
 * PATCH /api/trips/:tripId/itinerary
 * body: { day, place }
 *
 * RETURNS:
 * - The updated trip object (including updated planJson)
 */
async function savePlaceToTrip(tripId, day, place) {
  const token = localStorage.getItem("token"); // change key if yours is different

  const res = await fetch(`http://localhost:8090/api/trips/${tripId}/itinerary`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ day, place }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Save failed");
  }

  return data;
}



/**
 * removePlaceFromTrip()
 * WHY:
 * - Talks to backend to remove a saved place from a day
 * - We send identifiers so backend knows which item to remove
 *
 * Returns updated trip (same as savePlaceToTrip)
 */
async function removePlaceFromTrip(tripId, day, place) {
  const token = localStorage.getItem("token"); // change key if yours is different

  const res = await fetch(
    `http://localhost:8090/api/trips/${tripId}/itinerary/remove`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        day,
        placeId: place?.placeId,
        name: place?.name,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Remove failed");
  }

  return data;
}




/**
 * formatDistance()
 * WHY:
 * - The API returns distance in meters
 * - This formats it into "850 m" or "2.4 km" for humans
 */
function formatDistance(meters) {
  if (meters == null) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * googleMapsLink()
 * WHY:
 * - Quick "map" feature without building a real map UI yet
 * - Clicking this opens Google Maps search
 */
function googleMapsLink({ lat, lon, name }) {
  const query = encodeURIComponent(name ? `${name}` : `${lat},${lon}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * PlaceCard (CHILD component)
 * IMPORTANT IDEA:
 * - PlaceCard is only responsible for UI of ONE place
 * - It does NOT own backend logic
 *
 * NEW: we added "onSavePlace" prop
 * This is the "handler" coming from the parent.
 *
 * onSavePlace(place) will run in the parent (PlannerPage),
 * because the parent owns the tripId and the saved trip result.
 */
function PlaceCard({ place, onSavePlace }) {
  const title = place?.name || "Unknown place";
  const distance = formatDistance(place?.distanceMeters);

  const addressParts = [
    place?.addressLine1,
    place?.addressLine2,
    place?.city,
    place?.country,
  ].filter(Boolean);

  const address = addressParts.join(", ");

  const lat = place?.location?.lat;
  const lon = place?.location?.lon;

  /**
   * ✅ NEW local state: selectedDay
   * WHY local state here?
   * - The dropdown belongs to THIS card
   * - Each card can have its own selected day
   * - This state does NOT need to be global (it’s UI-only)
   */
  const [selectedDay, setSelectedDay] = useState("day1");

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-zinc-400">
            {address || "No address available"}
          </div>
        </div>
        <div className="text-sm text-zinc-300 whitespace-nowrap">{distance}</div>
      </div>

      {Array.isArray(place?.categories) && place.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {place.categories.slice(0, 4).map((c) => (
            <span
              key={c}
              className="text-xs px-2 py-1 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-300"
            >
              {c.replaceAll(".", " · ")}
            </span>
          ))}
        </div>
      )}

      {/* Buttons row */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {lat != null && lon != null && (
          <a
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-white text-black font-semibold text-sm"
            href={googleMapsLink({ lat, lon, name: title })}
            target="_blank"
            rel="noreferrer"
          >
            Open in Maps
          </a>
        )}

        {place?.website && (
          <a
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 font-semibold text-sm"
            href={place.website}
            target="_blank"
            rel="noreferrer"
          >
            Website
          </a>
        )}

        {/* ✅ NEW: Day selector dropdown */}
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 text-sm"
        >
          <option value="day1">Day 1</option>
          <option value="day2">Day 2</option>
          <option value="day3">Day 3</option>
        </select>

        {/* ✅ Save button now uses selectedDay */}
        <button
        type="button"
        onClick={() => onSavePlace(place, selectedDay)}
        className="..."
      >
        Save
      </button>

      </div>
    </div>
  );
}


/**
 * PlacesSection (CHILD component)
 * WHY this exists:
 * - It groups a list of places under a title (Restaurants / Attractions)
 * - It handles sorting + show more/less UI
 *
 * NEW: we accept onSavePlace and pass it to PlaceCard
 * This is the "pass handler down" chain:
 *
 * PlannerPage -> PlacesSection -> PlaceCard
 */
function PlacesSection({ title, places, onSavePlace }) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...(places || [])].sort((a, b) => {
    const da = a?.distanceMeters ?? Number.POSITIVE_INFINITY;
    const db = b?.distanceMeters ?? Number.POSITIVE_INFINITY;
    return da - db;
  });

  const visible = showAll ? sorted : sorted.slice(0, 6);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="text-sm text-zinc-400">{sorted.length} found</div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-zinc-400 text-sm">
          No results yet. Click “Plan trip”.
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {visible.map((p) => (
              <PlaceCard
                key={
                  p.placeId || `${p.name}-${p.location?.lat}-${p.location?.lon}`
                }
                place={p}
                onSavePlace={onSavePlace} // ✅ forward the handler to each card
              />
            ))}
          </div>

          {sorted.length > 6 && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 font-semibold text-sm"
            >
              {showAll ? "Show less" : "Show more"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/**
 * PlannerPage (PARENT component)
 * THIS is the main page that:
 * 1) shows the trip form
 * 2) sends POST request to planTrip()
 * 3) stores the response in React state (result)
 * 4) renders restaurants/attractions from result.planJson
 * 5) handles saving places (because it knows the tripId)
 */
export default function PlannerPage() {
  // Form state (what user types)
  const [form, setForm] = useState({
    destination: "Amsterdam",
    startDate: "2026-02-10",
    endDate: "2026-02-14",
    budget: 1200,
    vibe: "techno",
  });

  // result = the saved trip returned from backend
  const [result, setResult] = useState(null);

  // loading/error = UX state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      // budget must be a Number (API expects number, not string)
      [name]: name === "budget" ? Number(value) : value,
    }));
  }

  /**
   * onPlanTrip()
   * WHY this exists:
   * - The form button needs a function to run when clicked
   * - This function calls backend and updates UI state
   */
  async function onPlanTrip() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // planTrip() calls POST /api/trips/plan
      // It returns a trip object saved in DB
      //const data = await planTrip({ userId: USER_ID, ...form });

      const data = await planTrip(form);


      // Save it to state so UI can render restaurants/attractions
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * ✅ NEW: onSavePlace(place)
   * WHY it lives in PlannerPage (the parent):
   * - Only the parent knows the current trip id: result.id
   * - Saving requires tripId + day + place
   * - After saving, we want to update "result" so UI stays in sync
   */
  /**
 * onSavePlace(place, day)
 * WHY:
 * - PlaceCard now sends us BOTH the place and the chosen day
 * - Parent still owns tripId (result.id) so the parent still does the saving
 */
async function onSavePlace(place, day) {
  if (!result?.id) {
    alert("Plan a trip first so we have a trip to save into.");
    return;
  }

  try {
    setError("");

    // Save into the selected day (day1/day2/day3)
    const updatedTrip = await savePlaceToTrip(result.id, day, place);

    // Keep UI in sync with DB by updating React state with the updated trip
    setResult(updatedTrip);

    // Small UX confirmation
    const label = day === "day1" ? "Day 1" : day === "day2" ? "Day 2" : "Day 3";
    alert(`Saved to ${label} ✅`);
  } catch (err) {
    setError(err.message);
  }
}


  /**
 * onRemovePlace(place, day)
 * WHY in parent:
 * - Parent owns tripId (result.id)
 * - Parent owns state (result)
 * - After removal, we must setResult(updatedTrip) to refresh UI
 */
async function onRemovePlace(place, day) {
  if (!result?.id) return;

  try {
    setError("");

    const updatedTrip = await removePlaceFromTrip(result.id, day, place);

    // Update UI immediately with new itinerary
    setResult(updatedTrip);
  } catch (err) {
    setError(err.message);
  }
}



  // Safely read places from result
  const restaurants = result?.planJson?.places?.restaurants ?? [];
  const attractions = result?.planJson?.places?.attractions ?? [];

/**
 * itinerary:
 * - Stored inside planJson in the database
 * - Might not exist until you save something
 * - So we default to empty days to avoid "cannot read property" errors
 */
const itinerary = result?.planJson?.itinerary ?? {
  day1: [],
  day2: [],
  day3: [],
};




  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Trip Planner</h1>
        <p className="text-zinc-400">
          Planner page: POST to backend → save trip → render places.
        </p>
      </header>

      {/* FORM CARD */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-zinc-400">Destination</label>
            <input
              className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
              name="destination"
              value={form.destination}
              onChange={onChange}
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Budget (USD)</label>
            <input
              className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
              name="budget"
              type="number"
              value={form.budget}
              onChange={onChange}
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Start date</label>
            <input
              className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={onChange}
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">End date</label>
            <input
              className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={onChange}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-zinc-400">Vibe</label>
            <select
              className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
              name="vibe"
              value={form.vibe}
              onChange={onChange}
            >
              <option value="techno">Techno</option>
              <option value="nature">Nature</option>
              <option value="relax">Relax</option>
              <option value="food">Food</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        <button
          onClick={onPlanTrip}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-50"
        >
          {loading ? "Planning..." : "Plan trip"}
        </button>

        {/* Show errors (backend, network, etc.) */}
        {error && (
          <div className="text-sm text-red-300 border border-red-900/40 bg-red-950/20 rounded-xl p-3">
            {error}
          </div>
        )}
      </div>

      {/* PLACES LISTS */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PlacesSection
          title="Restaurants"
          places={restaurants}
          onSavePlace={onSavePlace} // ✅ pass handler down
        />
        <PlacesSection
          title="Attractions"
          places={attractions}
          onSavePlace={onSavePlace} // ✅ pass handler down
        />
      </div>

      {/* ITINERARY UI (NEW) */}
<div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-bold">Your Itinerary</h2>
    <div className="text-sm text-zinc-400">
      Saved items:{" "}
      {itinerary.day1.length + itinerary.day2.length + itinerary.day3.length}
    </div>
  </div>

  <div className="grid md:grid-cols-3 gap-4">
    {/* Day 1 */}
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div className="font-bold text-lg">Day 1</div>
      {itinerary.day1.length === 0 ? (
        <div className="text-sm text-zinc-400">Nothing saved yet.</div>
      ) : (
        <ul className="space-y-2">
          {itinerary.day1.map((p, idx) => (
            <li
            key={`${p.placeId || p.name}-${idx}`}
            className="text-sm text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between gap-3"
          >
            <span className="truncate">{p.name}</span>

            {/* ✅ NEW remove button */}
            <button
              onClick={() => onRemovePlace(p, "day1")}
              className="px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 text-xs hover:text-white"
            >
              Remove
            </button>
          </li>

          ))}
        </ul>
      )}
    </div>

    {/* Day 2 */}
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div className="font-bold text-lg">Day 2</div>
      {itinerary.day2.length === 0 ? (
        <div className="text-sm text-zinc-400">Nothing saved yet.</div>
      ) : (
        <ul className="space-y-2">
          {itinerary.day2.map((p, idx) => (
            <li
            key={`${p.placeId || p.name}-${idx}`}
            className="text-sm text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between gap-3"
          >
            <span className="truncate">{p.name}</span>

            {/* ✅ NEW remove button */}
            <button
              onClick={() => onRemovePlace(p, "day2")}
              className="px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 text-xs hover:text-white"
            >
              Remove
            </button>
          </li>
          ))}
        </ul>
      )}
    </div>

    {/* Day 3 */}
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div className="font-bold text-lg">Day 3</div>
      {itinerary.day3.length === 0 ? (
        <div className="text-sm text-zinc-400">Nothing saved yet.</div>
      ) : (
        <ul className="space-y-2">
          {itinerary.day3.map((p, idx) => (
            <li
            key={`${p.placeId || p.name}-${idx}`}
            className="text-sm text-zinc-200 border-b border-zinc-800 pb-2 flex items-center justify-between gap-3"
          >
            <span className="truncate">{p.name}</span>

            {/* ✅ NEW remove button */}
            <button
              onClick={() => onRemovePlace(p, "day3")}
              className="px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 text-xs hover:text-white"
            >
              Remove
            </button>
          </li>
          ))}
        </ul>
      )}
    </div>
  </div>
</div>


      {/* DEBUG OUTPUT */}
      {result && (
        <details className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <summary className="cursor-pointer font-semibold">
            Debug: raw API response
          </summary>
          <pre className="mt-3 overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
