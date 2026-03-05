import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";

export default function RegisterPage() {
  const nav = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      const data = await register(form);

      localStorage.setItem("token", data.token);

      nav("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">

      {/* Background video */}
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
          src="https://res.cloudinary.com/dxfwypgsp/video/upload/v1772696228/vecteezy_nightlife-on-the-street-of-red-lights-and-sex-industry-of_6419602_prpsnj.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark overlay */}
      <div className="fixed inset-0 -z-10 bg-black/70"></div>

      {/* Page content */}
      <div className="relative z-10 flex min-h-screen items-start justify-center pt-32 p-6">
        
        {/* Register card */}
        <div className="w-full max-w-md bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4 backdrop-blur-md">

          <h1 className="text-2xl font-bold">Register</h1>

          <form onSubmit={onSubmit} className="space-y-3">

            <div>
              <label className="text-sm text-zinc-400">Name (optional)</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400">Email</label>
              <input
                name="email"
                value={form.email}
                onChange={onChange}
                className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400">Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
              />
            </div>

            <button
              disabled={loading}
              className="w-full px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create account"}
            </button>

            {error && (
              <div className="text-sm text-red-300 border border-red-900/40 bg-red-950/20 rounded-xl p-3">
                {error}
              </div>
            )}

          </form>

          <div className="text-sm text-zinc-400">
            Already have an account?{" "}
            <Link className="text-white underline" to="/login">
              Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}