import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTrip } from "../api/trips";

/**
 * TripDetailPage
 * Why:
 * - teaches route params (/trips/:id)
 * - teaches fetching one resource by id
 * - this becomes your "share link" page later
 */
export default function TripDetailPage() {
  const { id } = useParams(); // reads :id from the URL

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getTrip(id);
        setTrip(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const restaurants = trip?.planJson?.places?.restaurants ?? [];
  const attractions = trip?.planJson?.places?.attractions ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Trip Detail</h1>
          <Link
            to="/trips"
            className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 font-semibold text-sm"
          >
            Back to trips
          </Link>
        </div>
        <p className="text-zinc-400">
          This page calls <code>/api/trips/:id</code> and renders the stored plan.
        </p>
      </header>

      {loading && <div className="text-zinc-400">Loading trip...</div>}

      {error && (
        <div className="text-sm text-red-300 border border-red-900/40 bg-red-950/20 rounded-xl p-3">
          {error}
        </div>
      )}

      {trip && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="text-xl font-bold">{trip.title}</div>
            <div className="text-zinc-400 text-sm mt-1">
              {trip.destination} • {trip.vibe} • ${trip.budget}
            </div>
            <div className="text-zinc-300 text-sm mt-2">
              {new Date(trip.startDate).toLocaleDateString()} →{" "}
              {new Date(trip.endDate).toLocaleDateString()}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="text-lg font-bold mb-3">Restaurants</div>
              <ul className="space-y-2 text-sm text-zinc-300">
                {restaurants.slice(0, 10).map((p) => (
                  <li key={p.placeId || p.name} className="border-b border-zinc-800 pb-2">
                    {p.name}
                  </li>
                ))}
                {restaurants.length === 0 && (
                  <li className="text-zinc-400">No restaurants stored.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="text-lg font-bold mb-3">Attractions</div>
              <ul className="space-y-2 text-sm text-zinc-300">
                {attractions.slice(0, 10).map((p) => (
                  <li key={p.placeId || p.name} className="border-b border-zinc-800 pb-2">
                    {p.name}
                  </li>
                ))}
                {attractions.length === 0 && (
                  <li className="text-zinc-400">No attractions stored.</li>
                )}
              </ul>
            </div>
          </div>

          <details className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <summary className="cursor-pointer font-semibold">Debug: full trip JSON</summary>
            <pre className="mt-3 overflow-auto text-sm">
              {JSON.stringify(trip, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
