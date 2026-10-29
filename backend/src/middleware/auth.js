const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyAccess } = require("../services/token.service");
const { hasArea } = require("../constants/permissions");

const fromPayload = (payload) => ({
  id: payload.sub,
  role: payload.role,
  permissions: payload.permissions || [],
  permissionPreset: payload.permissionPreset || null,
});

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized("Missing access token");
  try {
    const payload = verifyAccess(token);
    req.user = fromPayload(payload);
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
      req.user = fromPayload(payload);
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

/* Per-area check. Admins pass everything; staff pass only the areas the Super
   Admin granted (via exact permissions, else their preset). */
const requireArea =
  (area) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized("Authentication required"));
    if (!hasArea(req.user, area)) {
      const err = ApiError.forbidden("Your permissions do not include this area");
      err.code = "FORBIDDEN";
      return next(err);
    }
    next();
  };

module.exports = { protect, optionalAuth, requireRole, requireArea };
