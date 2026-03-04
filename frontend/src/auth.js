/**
 * auth.js
 * WHY:
 * - Central place for token handling so we don’t repeat code everywhere
 * - Makes ProtectedRoute + navbar easy
 */

export function getToken() {
  return localStorage.getItem("token");
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function logout() {
  localStorage.removeItem("token");
}
