const jwt = require("jsonwebtoken");
const { ApiError } = require("./errorHandler");

// Wraps async route handlers so rejected promises reach the error handler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Protects /admin/* APIs. Requires: Authorization: Bearer <token>
function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new ApiError(401, "Authentication required.");

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    next(new ApiError(401, "Invalid or expired session."));
  }
}

module.exports = { asyncHandler, requireAdmin };
