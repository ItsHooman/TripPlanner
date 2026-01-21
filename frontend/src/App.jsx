import { NavLink, Route, Routes } from "react-router-dom";
import PlannerPage from "./pages/PlannerPage";
import TripsListPage from "./pages/TripsListPage";
import TripDetailPage from "./pages/TripDetailPage";

/**
 * App.jsx is now just the "shell" of the app:
 * - navigation
 * - routes
 * Why:
 * - keeps pages separated
 * - makes the app scalable
 */
export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation */}
        <nav className="flex items-center gap-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl border text-sm font-semibold ${
                isActive
                  ? "bg-white text-black border-white"
                  : "bg-zinc-950 text-zinc-100 border-zinc-800"
              }`
            }
          >
            Planner
          </NavLink>

          <NavLink
            to="/trips"
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl border text-sm font-semibold ${
                isActive
                  ? "bg-white text-black border-white"
                  : "bg-zinc-950 text-zinc-100 border-zinc-800"
              }`
            }
          >
            Saved Trips
          </NavLink>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<PlannerPage />} />
          <Route path="/trips" element={<TripsListPage />} />
          <Route path="/trips/:id" element={<TripDetailPage />} />
        </Routes>
      </div>
    </div>
  );
}
