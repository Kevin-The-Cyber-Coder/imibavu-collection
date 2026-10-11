const ApiError = require("../utils/ApiError");

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return next(ApiError.validation(details));
    }
    if (source === "body") req.body = result.data;
    else req[source] = result.data;
    next();
  };
}

module.exports = validate;
