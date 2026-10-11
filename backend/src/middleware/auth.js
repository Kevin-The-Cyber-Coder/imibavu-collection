const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyAccess } = require("../services/token.service");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized("Missing access token");
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyAccess(token);
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      /* ignore — treat as guest */
    }
  }
  next();
});

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Insufficient permissions"));
    }
    next();
  };

module.exports = { protect, optionalAuth, requireRole };
