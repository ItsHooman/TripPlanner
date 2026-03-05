/**
 * client.js
 * Why this file exists:
 * - one single place to control backend URL (8090)
 * - one single place to handle errors consistently
 * - keeps fetch code out of UI components (clean separation)
 */

// Backend base URL (change once here, used everywhere)
//export const API_BASE = "http://localhost:8090";

/**
 * request()
 * A small wrapper around fetch that:
 * - sets JSON headers
 * - parses JSON automatically
 * - throws helpful errors
 */
/*export async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      // Always tell backend we speak JSON
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  // Try to parse JSON even if server returned an error
  const data = await res.json().catch(() => null);

  // If HTTP status is not 2xx, throw a clean error
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}
*/
export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8090";


/**
 * getToken()
 * WHY:
 * - Token is stored in localStorage after login/register
 * - Client attaches it to every request automatically
 */
function getToken() {
  return localStorage.getItem("token");
}

export async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const token = getToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",

      // ✅ Attach token if it exists
      ...(token ? { Authorization: `Bearer ${token}` } : {}),

      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return data;
}
