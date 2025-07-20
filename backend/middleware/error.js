import { formatResponse } from "../utils/helpers.js";

// Global error handler
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error("Error:", err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { statusCode: 404, message };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = { statusCode: 400, message };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = { statusCode: 400, message: message.join(", ") };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = { statusCode: 401, message };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = { statusCode: 401, message };
  }

  res
    .status(error.statusCode || 500)
    .json(formatResponse(false, error.message || "Server Error"));
};

// Not found middleware
export const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  res.status(404);
  next(error);
};
