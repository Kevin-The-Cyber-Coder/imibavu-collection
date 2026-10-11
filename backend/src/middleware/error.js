const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let e = err;

  if (err?.name === "ValidationError" && err?.errors) {
    e = ApiError.validation(
      Object.values(err.errors).map((x) => ({ path: x.path, message: x.message }))
    );
  } else if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    e = ApiError.conflict(`That ${field} is already in use`);
  } else if (err?.name === "CastError") {
    e = ApiError.badRequest("Invalid id format");
  } else if (!(e instanceof ApiError)) {
    logger.error({ err }, "Unhandled error");
    e = new ApiError(500, "INTERNAL_ERROR", "Something went wrong");
  }

  res.status(e.status).json({
    error: { code: e.code, message: e.message, details: e.details || undefined },
  });
}

module.exports = { notFound, errorHandler };
