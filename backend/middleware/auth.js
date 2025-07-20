import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { formatResponse } from "../utils/helpers.js";

// Protect routes - Authentication middleware
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res
          .status(401)
          .json(formatResponse(false, "User not found, authorization denied"));
      }

      if (!req.user.isActive) {
        return res
          .status(401)
          .json(formatResponse(false, "Account has been deactivated"));
      }

      next();
    } catch (error) {
      return res
        .status(401)
        .json(formatResponse(false, "Not authorized, token failed"));
    }
  }

  if (!token) {
    return res
      .status(401)
      .json(formatResponse(false, "Not authorized, no token provided"));
  }
});

// Admin access middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res
      .status(403)
      .json(formatResponse(false, "Access denied. Admin access required"));
  }
};

// Restaurant owner access middleware
export const restaurantOwner = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "restaurant_owner" || req.user.role === "admin")
  ) {
    next();
  } else {
    res
      .status(403)
      .json(
        formatResponse(false, "Access denied. Restaurant owner access required")
      );
  }
};

// Customer access middleware
export const customer = (req, res, next) => {
  if (req.user && (req.user.role === "customer" || req.user.role === "admin")) {
    next();
  } else {
    res
      .status(403)
      .json(formatResponse(false, "Access denied. Customer access required"));
  }
};

// Multiple roles middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json(
          formatResponse(
            false,
            `Access denied. Required roles: ${roles.join(", ")}`
          )
        );
    }
    next();
  };
};
