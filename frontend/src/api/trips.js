/**
 * trips.js
 * Why:
 * - UI should call "planTrip()" not write fetch everywhere
 * - this makes your code reusable and testable
 */

import { request } from "./client";

/**
 * POST /api/trips/plan
 * payload example:
 * { userId, destination, startDate, endDate, budget, vibe }
 */
export function planTrip(payload) {
  return request("/api/trips/plan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/trips?userId=...
 * returns list of trips for that user
 */
export function listTrips(userId) {
  return request(`/api/trips?userId=${encodeURIComponent(userId)}`, {
    method: "GET",
  });
}

/**
 * GET /api/trips/:id
 * returns one trip with planJson etc.
 */
export function getTrip(id) {
  return request(`/api/trips/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}
