import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTrip } from "../api/trips";

const BG_VIDEO =
  "https://res.cloudinary.com/dxfwypgsp/video/upload/v1772696438/WhatsApp_Video_2026-03-05_at_02.40.07_ksdet1.mp4";

export default function TripDetailPage() {
  const { id } = useParams();

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
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-bold">Trip Detail</h1>
              <Link
                to="/trips"
                className="px-4 py-2 rounded-xl bg-white text-black border border-white font-semibold text-sm hover:bg-zinc-200 transition"
              >
                Back to trips
              </Link>
            </div>
            <p className="text-zinc-200/80">
              This page calls <code className="text-white">/api/trips/:id</code>{" "}
              and renders the stored plan.
            </p>
          </header>

          {loading && <div className="text-zinc-200/70">Loading trip...</div>}

          {error && (
            <div className="text-sm text-red-200 border border-red-900/40 bg-red-950/30 rounded-xl p-3">
              {error}
            </div>
          )}

          {trip && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
                <div className="text-xl font-bold">{trip.title}</div>
                <div className="text-zinc-200/70 text-sm mt-1">
                  {trip.destination} • {trip.vibe} • ${trip.budget}
                </div>
                <div className="text-zinc-200/80 text-sm mt-2">
                  {new Date(trip.startDate).toLocaleDateString()} →{" "}
                  {new Date(trip.endDate).toLocaleDateString()}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
                  <div className="text-lg font-bold mb-3">Restaurants</div>
                  <ul className="space-y-2 text-sm text-zinc-200/80">
                    {restaurants.slice(0, 10).map((p) => (
                      <li
                        key={p.placeId || p.name}
                        className="border-b border-zinc-800 pb-2"
                      >
                        {p.name}
                      </li>
                    ))}
                    {restaurants.length === 0 && (
                      <li className="text-zinc-200/60">No restaurants stored.</li>
                    )}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
                  <div className="text-lg font-bold mb-3">Attractions</div>
                  <ul className="space-y-2 text-sm text-zinc-200/80">
                    {attractions.slice(0, 10).map((p) => (
                      <li
                        key={p.placeId || p.name}
                        className="border-b border-zinc-800 pb-2"
                      >
                        {p.name}
                      </li>
                    ))}
                    {attractions.length === 0 && (
                      <li className="text-zinc-200/60">No attractions stored.</li>
                    )}
                  </ul>
                </div>
              </div>

              <details className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
                <summary className="cursor-pointer font-semibold">
                  Debug: full trip JSON
                </summary>
                <pre className="mt-3 overflow-auto text-sm text-zinc-100">
                  {JSON.stringify(trip, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}