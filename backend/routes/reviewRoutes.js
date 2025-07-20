import express from "express";
import { body } from "express-validator";
import {
  createReview,
  getRestaurantReviews,
  getReview,
  updateReview,
  deleteReview,
  addRestaurantResponse,
  markReviewHelpful,
  reportReview,
  getMyReviews,
  getReviewStats,
} from "../controllers/reviewController.js";
import { protect, customer, restaurantOwner } from "../middleware/auth.js";

const router = express.Router();

// @desc    Public routes
router.get("/restaurant/:restaurantId", getRestaurantReviews);
router.get("/restaurant/:restaurantId/stats", getReviewStats);
router.get("/:id", getReview);

// @desc    Protected routes
router.use(protect);

// @desc    Customer routes
router.post(
  "/",
  customer,
  [
    body("orderId").isMongoId().withMessage("Valid order ID is required"),
    body("ratings.food")
      .isInt({ min: 1, max: 5 })
      .withMessage("Food rating must be between 1-5"),
    body("ratings.delivery")
      .isInt({ min: 1, max: 5 })
      .withMessage("Delivery rating must be between 1-5"),
    body("ratings.service")
      .isInt({ min: 1, max: 5 })
      .withMessage("Service rating must be between 1-5"),
  ],
  createReview
);

router.get("/my/reviews", customer, getMyReviews);

router.route("/:id").put(customer, updateReview).delete(deleteReview); // Customer or admin can delete

// @desc    Restaurant owner routes
router.post(
  "/:id/response",
  restaurantOwner,
  [
    body("message").notEmpty().withMessage("Response message is required"),
    body("message")
      .isLength({ max: 500 })
      .withMessage("Response cannot exceed 500 characters"),
  ],
  addRestaurantResponse
);

// @desc    General user actions
router.put(
  "/:id/helpful",
  [body("isHelpful").isBoolean().withMessage("isHelpful must be boolean")],
  markReviewHelpful
);

router.post(
  "/:id/report",
  [body("reason").notEmpty().withMessage("Report reason is required")],
  reportReview
);

export default router;
