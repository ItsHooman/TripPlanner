import { useState } from "react";
import { planTrip } from "../api/trips";
import { USER_ID } from "../config";

/**
 * Helpers:
 * Small functions like this keep components readable.
 */
function formatDistance(meters) {
  if (meters == null) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function googleMapsLink({ lat, lon, name }) {
  const query = encodeURIComponent(name ? `${name}` : `${lat},${lon}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function PlaceCard({ place }) {
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

      <div className="flex flex-wrap gap-2 pt-1">
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
      </div>
    </div>
  );
}

function PlacesSection({ title, places }) {
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
                key={p.placeId || `${p.name}-${p.location?.lat}-${p.location?.lon}`}
                place={p}
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

export default function PlannerPage() {
  const [form, setForm] = useState({
    destination: "Amsterdam",
    startDate: "2026-02-10",
    endDate: "2026-02-14",
    budget: 1200,
    vibe: "techno",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "budget" ? Number(value) : value,
    }));
  }

  async function onPlanTrip() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // We call our API function instead of fetch
      const data = await planTrip({ userId: USER_ID, ...form });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const restaurants = result?.planJson?.places?.restaurants ?? [];
  const attractions = result?.planJson?.places?.attractions ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Trip Planner</h1>
        <p className="text-zinc-400">
          Planner page: POST to backend → save trip → render places.
        </p>
      </header>

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

        {error && (
          <div className="text-sm text-red-300 border border-red-900/40 bg-red-950/20 rounded-xl p-3">
            {error}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PlacesSection title="Restaurants" places={restaurants} />
        <PlacesSection title="Attractions" places={attractions} />
      </div>

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
