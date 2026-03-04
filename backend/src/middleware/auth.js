import jwt from "jsonwebtoken";

/**
 * authMiddleware
 * WHY:
 * - We want the backend (not the frontend) to know who the user is.
 * - Frontend sends a token in "Authorization: Bearer <token>"
 * - This middleware verifies the token and sets req.user = { id, email }
 *
 * If token is missing/invalid => 401 Unauthorized
 */
export function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization; // "Bearer <token>"

    // If there's no authorization header, user is not logged in
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    // Extract the token part after "Bearer "
    const token = header.split(" ")[1];

    // Verify token signature + expiration
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request so routes can use it
    req.user = payload; // e.g. { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
