class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFound(req, res, next) {
  next(new ApiError(404, "Resource not found."));
}

// Central error handler — never leaks stack traces or raw Mongo errors to clients.
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong.";

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier supplied.";
  }
  if (err.code === 11000) {
    statusCode = 409;
    message = "A record with that identifier already exists.";
  }
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Invalid data supplied.";
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = { ApiError, notFound, errorHandler };
