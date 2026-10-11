class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(msg = "Bad request", details) {
    return new ApiError(400, "BAD_REQUEST", msg, details);
  }
  static unauthorized(msg = "Unauthorized") {
    return new ApiError(401, "UNAUTHORIZED", msg);
  }
  static forbidden(msg = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", msg);
  }
  static notFound(msg = "Not found") {
    return new ApiError(404, "NOT_FOUND", msg);
  }
  static conflict(msg = "Conflict") {
    return new ApiError(409, "CONFLICT", msg);
  }
  static tooMany(msg = "Too many requests") {
    return new ApiError(429, "TOO_MANY_REQUESTS", msg);
  }
  static validation(details, msg = "Validation failed") {
    return new ApiError(422, "VALIDATION_ERROR", msg, details);
  }
}

module.exports = ApiError;
