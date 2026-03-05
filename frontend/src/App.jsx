import { NavLink, Route, Routes, Navigate, Outlet } from "react-router-dom";
import PlannerPage from "./pages/PlannerPage";
import TripsListPage from "./pages/TripsListPage";
import TripDetailPage from "./pages/TripDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";


/**
 * ProtectedLayout
 * WHY:
 * - Wraps all "private" pages (planner/trips)
 * - If user has no token -> redirect to /login
 * - If user is logged in -> show the navigation + the nested page (Outlet)
 *
 * Outlet = "render whatever child route matches"
 */
function ProtectedLayout() {
  // Token is our "logged in" signal (simple for MVP)
  const token = localStorage.getItem("token");

  // If no token, block access to protected pages
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
  className="min-h-screen text-zinc-100 bg-cover bg-center"
  style={{ backgroundImage: "url('/bg.jpg')" }}
>
  <div className="min-h-screen bg-black/60 p-6">
    <div className="max-w-5xl mx-auto space-y-6"></div>
        {/* Navigation (ONLY shows when logged in) */}
        <nav className="sticky top-0 z-50 flex items-center gap-3">
          <NavLink
  to="/"
  end
  className={({ isActive }) =>
    `px-4 py-2 rounded-xl border text-sm font-semibold transition ${
      isActive
        ? "bg-white text-black border-white"
        : "bg-zinc-900/70 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
    }`
  }
>
  Planner
</NavLink>

<NavLink
  to="/trips"
  className={({ isActive }) =>
    `px-4 py-2 rounded-xl border text-sm font-semibold transition ${
      isActive
        ? "bg-white text-black border-white"
        : "bg-zinc-900/70 text-zinc-200 border-zinc-700 hover:bg-zinc-800"
    }`
  }
>
  Saved Trips
</NavLink>

          {/* Logout button */}
          <button
            onClick={() => {
              // Remove token so user becomes "logged out"
              localStorage.removeItem("token");

              // Redirect to login page
              window.location.href = "/login";
            }}
            className="px-4 py-2 rounded-xl border text-sm font-semibold bg-zinc-950 text-zinc-100 border-zinc-800"
          >
            Logout
          </button>
        </nav>

        {/* This renders the page for the matching protected route */}
        <Outlet />
      </div>
    </div>
  );
}

/**
 * App.jsx
 * WHAT IT DOES NOW:
 * - Public routes: /login, /register
 * - Protected routes: /, /trips, /trips/:id (wrapped by ProtectedLayout)
 *
 * IMPORTANT:
 * - If you are logged in and try to visit /login -> it redirects to /
 * - If you are logged out and try to visit / -> it redirects to /login
 */
export default function App() {
  const token = localStorage.getItem("token");

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={token ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={token ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      {/* Protected routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<PlannerPage />} />
        <Route path="/trips" element={<TripsListPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
