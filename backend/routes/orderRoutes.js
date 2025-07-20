import express from "express";
import { body } from "express-validator";
import {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  assignDeliveryPartner,
  getRestaurantOrders,
  cancelOrder,
  verifyDeliveryOTP,
  getOrderStats,
} from "../controllers/orderController.js";
import {
  protect,
  customer,
  restaurantOwner,
  authorize,
} from "../middleware/auth.js";

const router = express.Router();

// @desc    Protected routes
router.use(protect);

// @desc    Customer routes
router.post(
  "/",
  customer,
  [
    body("restaurant")
      .isMongoId()
      .withMessage("Valid restaurant ID is required"),
    body("items")
      .isArray({ min: 1 })
      .withMessage("At least one item is required"),
    body("deliveryAddress")
      .isMongoId()
      .withMessage("Valid delivery address is required"),
    body("paymentMethod")
      .isIn(["cash_on_delivery", "card", "upi", "wallet", "net_banking"])
      .withMessage("Valid payment method is required"),
  ],
  createOrder
);

router.get("/my-orders", customer, getMyOrders);

// @desc    Restaurant owner routes
router.get("/restaurant-orders", restaurantOwner, getRestaurantOrders);

// @desc    Shared routes (accessible by customer, restaurant owner, delivery partner, admin)
router.get("/stats", getOrderStats);
router.get("/:id", getOrder);

// @desc    Status update routes
router.put(
  "/:id/status",
  [
    body("status")
      .isIn([
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ])
      .withMessage("Valid status is required"),
  ],
  updateOrderStatus
);

// @desc    Restaurant specific routes
router.put(
  "/:id/assign-delivery",
  restaurantOwner,
  [
    body("deliveryPartnerId")
      .isMongoId()
      .withMessage("Valid delivery partner ID is required"),
  ],
  assignDeliveryPartner
);

// @desc    Customer specific routes
router.put("/:id/cancel", customer, cancelOrder);

// @desc    Delivery partner routes
router.post(
  "/:id/verify-otp",
  authorize("delivery_partner", "admin"),
  [
    body("otp")
      .isLength({ min: 4, max: 6 })
      .withMessage("Valid OTP is required"),
  ],
  verifyDeliveryOTP
);

export default router;
