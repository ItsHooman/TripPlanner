import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/auth";

export default function LoginPage() {
  const nav = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(form);
      localStorage.setItem("token", data.token);

      // go to your planner page after login (change if your route is different)
      nav("/planner");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    // h-screen + overflow-hidden = no scrolling, always one screen
    <div className="relative h-screen w-full overflow-hidden text-white">
      {/* Background video layer */}
      <video
  autoPlay
  muted
  loop
  playsInline
  preload="metadata"
  className="fixed inset-0 -z-10 h-screen w-screen pointer-events-none"
  style={{ objectFit: "cover", objectPosition: "center" }}
>
  <source
    src="https://res.cloudinary.com/dxfwypgsp/video/upload/v1772695148/vecteezy_young-woman-hiker-travel-alone-in-the-forest_3383330_jcthvx.mp4"
    type="video/mp4"
  />
</video>

      {/* Dark overlay for readability (does NOT overlap content because content has higher z-index) */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Content layer */}
      <div className="relative z-10 grid h-full grid-cols-1 md:grid-cols-2">
        {/* LEFT: Welcome/Intro (hidden on mobile to keep it clean) */}
        <div className="hidden md:flex items-center justify-center p-10">
          <div className="max-w-md rounded-2xl border border-white/10 bg-black/35 p-8 backdrop-blur-md">
            <h1 className="text-4xl font-extrabold leading-tight">
              Welcome to TripPlanner
            </h1>

            <p className="mt-4 text-zinc-200 leading-relaxed">
              Plan trips in minutes. Get weather context + nearby places, then
              save your favorite spots into a day-by-day itinerary.
            </p>

            <ul className="mt-6 space-y-2 text-zinc-200">
              <li>Discover restaurants & attractions</li>
              <li>Build Day 1 / Day 2 / Day 3 itinerary</li>
              <li>Modify them based on your vibe</li>
              <li>Save and manage your trips</li>
            </ul>

            
          </div>
        </div>

        {/* RIGHT: Login Card */}
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-md shadow-2xl">
            <h2 className="text-2xl font-bold">Login</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Sign in to plan and save your trips.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={onChange}
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                disabled={loading}
                className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              {error && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {error}
                </div>
              )}
            </form>

            <div className="mt-5 text-sm text-zinc-300">
              No account?{" "}
              <Link className="text-white underline" to="/register">
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}