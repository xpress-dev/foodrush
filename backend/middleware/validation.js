import { validationResult } from "express-validator";
import { formatResponse } from "../utils/helpers.js";

// Validation error handler middleware
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return res
      .status(400)
      .json(
        formatResponse(false, "Validation failed", null, {
          errors: errorMessages,
        })
      );
  }

  next();
};
