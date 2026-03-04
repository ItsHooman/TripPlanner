import { Navigate, Outlet } from "react-router-dom";
import { isLoggedIn } from "../auth";

/**
 * ProtectedRoute
 * WHY:
 * - Prevents users from entering protected pages without being logged in
 * - If there is no token -> redirect to /login
 *
 * HOW it works:
 * - <Outlet /> renders nested routes inside this guard
 */
export default function ProtectedRoute() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
