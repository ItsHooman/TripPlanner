import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTrips } from "../api/trips";

const BG_VIDEO =
  "https://res.cloudinary.com/dxfwypgsp/video/upload/v1772696438/WhatsApp_Video_2026-03-05_at_02.40.07_ksdet1.mp4";

export default function TripsListPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await listTrips();
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
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        className="fixed inset-0 -z-10 h-screen w-screen pointer-events-none"
        style={{ objectFit: "cover", objectPosition: "center" }}
      >
        <source src={BG_VIDEO} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="fixed inset-0 -z-10 bg-black/70 pointer-events-none" />

      {/* Page content */}
      <div className="relative z-10 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">Saved Trips</h1>
            {/* <p className="text-zinc-200/80">
              This page calls <code className="text-white">/api/trips</code> and
              lists DB results.
            </p> */}
          </header>

          {loading && <div className="text-zinc-200/70">Loading trips...</div>}

          {error && (
            <div className="text-sm text-red-200 border border-red-900/40 bg-red-950/30 rounded-xl p-3">
              {error}
            </div>
          )}

          {!loading && !error && trips.length === 0 && (
            <div className="text-zinc-200/70">
              No trips yet. Go to the Planner and click “Plan trip”.
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {trips.map((t) => (
              <Link
                key={t.id}
                to={`/trips/${t.id}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-md hover:bg-zinc-900/70 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">{t.title}</div>
                    <div className="text-sm text-zinc-200/70">
                      {t.destination} • {t.vibe} • ${t.budget}
                    </div>
                  </div>

                  <div className="text-xs text-zinc-200/60 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-sm text-zinc-200/80 mt-2">
                  {new Date(t.startDate).toLocaleDateString()} →{" "}
                  {new Date(t.endDate).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}