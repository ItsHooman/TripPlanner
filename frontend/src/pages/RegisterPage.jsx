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

      // Save token so API client can attach it
      localStorage.setItem("token", data.token);

      // Go to planner
      nav("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Register</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm text-zinc-400">Name (optional)</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Email</label>
          <input
            name="email"
            value={form.email}
            onChange={onChange}
            className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            className="w-full mt-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800"
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
        Already have an account? <Link className="text-white underline" to="/login">Login</Link>
      </div>
    </div>
  );
}
