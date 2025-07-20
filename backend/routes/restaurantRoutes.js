import express from "express";
import { body } from "express-validator";
import {
  createRestaurant,
  getRestaurants,
  getNearbyRestaurants,
  getRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantMenu,
  getMyRestaurant,
  updateRestaurantStatus,
  getRestaurantStats,
} from "../controllers/restaurantController.js";
import { protect, restaurantOwner, admin } from "../middleware/auth.js";

const router = express.Router();

// @desc    Public routes
router.get("/", getRestaurants);
router.get("/nearby", getNearbyRestaurants);
router.get("/:id", getRestaurant);
router.get("/:id/menu", getRestaurantMenu);

// @desc    Protected routes
router.use(protect);

// @desc    Restaurant owner routes
router.post(
  "/",
  restaurantOwner,
  [
    body("name").notEmpty().withMessage("Restaurant name is required"),
    body("cuisine")
      .isArray({ min: 1 })
      .withMessage("At least one cuisine type is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phoneNumber").notEmpty().withMessage("Phone number is required"),
    body("address.addressLine1").notEmpty().withMessage("Address is required"),
    body("address.city").notEmpty().withMessage("City is required"),
    body("address.state").notEmpty().withMessage("State is required"),
    body("address.postalCode")
      .notEmpty()
      .withMessage("Postal code is required"),
    body("address.coordinates.latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Valid latitude is required"),
    body("address.coordinates.longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Valid longitude is required"),
  ],
  createRestaurant
);

router.get("/my/restaurant", restaurantOwner, getMyRestaurant);

router
  .route("/:id")
  .put(restaurantOwner, updateRestaurant)
  .delete(restaurantOwner, deleteRestaurant);

router.put(
  "/:id/status",
  restaurantOwner,
  [body("isCurrentlyOpen").isBoolean().withMessage("Status must be boolean")],
  updateRestaurantStatus
);

router.get("/:id/stats", restaurantOwner, getRestaurantStats);

export default router;
