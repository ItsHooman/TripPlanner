import { Link, useNavigate } from "react-router-dom";
import { logout } from "../auth";

/**
 * Navbar
 * WHY:
 * - Gives a real app feel
 * - Makes it easy to navigate between Planner and Trips
 * - Adds logout UX
 *
 * Props:
 * - user: object from /api/auth/me (or null)
 */
export default function Navbar({ user }) {
  const nav = useNavigate();

  function onLogout() {
    // Remove token
    logout();

    // Redirect to login
    nav("/login");
  }

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link className="font-bold text-white" to="/">
            Trip Planner
          </Link>

          <Link className="text-sm text-zinc-300 hover:text-white" to="/trips">
            Saved Trips
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Show user info if we have it */}
          {user ? (
            <div className="text-sm text-zinc-300">
              Logged in as{" "}
              <span className="text-white font-semibold">
                {user.name || user.email}
              </span>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">Checking session...</div>
          )}

          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 text-sm font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
