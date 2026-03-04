import { request } from "./client";

/**
 * register()
 * - creates user
 * - returns { token, user }
 */
export function register({ email, password, name }) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

/**
 * login()
 * - verifies credentials
 * - returns { token, user }
 */
export function login({ email, password }) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * me()
 * - returns current logged-in user using token
 */
export function me() {
  return request("/api/auth/me", { method: "GET" });
}
