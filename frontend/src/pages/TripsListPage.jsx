import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTrips } from "../api/trips";
import { USER_ID } from "../config";

/**
 * TripsListPage
 * Why this page exists:
 * - proves persistence: trips are saved in DB and can be retrieved
 * - gives you a real multi-page app (portfolio upgrade)
 */
export default function TripsListPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await listTrips(USER_ID);
        setTrips(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Saved Trips</h1>
        <p className="text-zinc-400">
          This page calls <code>/api/trips?userId=...</code> and lists DB results.
        </p>
      </header>

      {loading && <div className="text-zinc-400">Loading trips...</div>}

      {error && (
        <div className="text-sm text-red-300 border border-red-900/40 bg-red-950/20 rounded-xl p-3">
          {error}
        </div>
      )}

      {!loading && !error && trips.length === 0 && (
        <div className="text-zinc-400">
          No trips yet. Go to the Planner and click “Plan trip”.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {trips.map((t) => (
          <Link
            key={t.id}
            to={`/trips/${t.id}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:bg-zinc-900 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-lg font-semibold">{t.title}</div>
                <div className="text-sm text-zinc-400">
                  {t.destination} • {t.vibe} • ${t.budget}
                </div>
              </div>

              <div className="text-xs text-zinc-400 whitespace-nowrap">
                {new Date(t.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="text-sm text-zinc-300 mt-2">
              {new Date(t.startDate).toLocaleDateString()} →{" "}
              {new Date(t.endDate).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
