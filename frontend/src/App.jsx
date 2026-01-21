import { useState } from "react";

/**
 * IMPORTANT:
 * Replace this with the ID printed from seed.js
 * This is temporary until we implement real auth.
 */
const USER_ID = "PASTE_YOUR_SEEDED_USER_ID_HERE";

export default function App() {
  // Form state: what user inputs
  const [form, setForm] = useState({
    destination: "Amsterdam",
    startDate: "2026-02-10",
    endDate: "2026-02-14",
    budget: 1200,
    vibe: "techno",
  });

  // Result: response from backend
  const [result, setResult] = useState(null);

  // Loading: UX feedback while calling API
  const [loading, setLoading] = useState(false);

  // Generic change handler for inputs/select
  const onChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      // budget should be a number, not a string
      [name]: name === "budget" ? Number(value) : value,
    }));
  };

  // Calls backend endpoint to plan + save trip
  const planTrip = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("http://localhost:8080/api/trips/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: USER_ID,
          ...form,
        }),
      });

      const data = await res.json();

      // If backend returns an error, show it too
      setResult(data);
    } catch (err) {
      setResult({ error: "Frontend error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Trip Planner (MVP)</h1>
          <p className="text-zinc-400">
            React + Express + Postgres + Prisma + Open-Meteo (Geocode + Weather)
          </p>
        </header>

        {/* Form card */}
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
            onClick={planTrip}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-50"
          >
            {loading ? "Planning..." : "Plan trip"}
          </button>
        </div>

        {/* Output */}
        {result && (
          <pre className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
