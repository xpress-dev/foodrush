import express from "express";
import { body } from "express-validator";
import {
  applyDeliveryPartner,
  getMyProfile,
  updateMyProfile,
  updateAvailability,
  getAvailableOrders,
  acceptOrder,
  getActiveOrders,
  getDeliveryHistory,
  getMyStats,
  getDeliveryPartners,
  updateApprovalStatus,
} from "../controllers/deliveryPartnerController.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

// @desc    Protected routes
router.use(protect);

// @desc    Application route
router.post(
  "/apply",
  [
    body("personalInfo.dateOfBirth")
      .isISO8601()
      .withMessage("Valid date of birth is required"),
    body("personalInfo.gender")
      .isIn(["male", "female", "other"])
      .withMessage("Valid gender is required"),
    body("documents.aadharCard.number")
      .matches(/^\d{12}$/)
      .withMessage("Valid 12-digit Aadhar number is required"),
    body("documents.panCard.number")
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage("Valid PAN number is required"),
    body("vehicleInfo.type")
      .isIn(["bike", "scooter", "bicycle", "car"])
      .withMessage("Valid vehicle type is required"),
    body("bankDetails.accountHolderName")
      .notEmpty()
      .withMessage("Account holder name is required"),
    body("bankDetails.accountNumber")
      .notEmpty()
      .withMessage("Account number is required"),
    body("bankDetails.ifscCode")
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .withMessage("Valid IFSC code is required"),
  ],
  applyDeliveryPartner
);

// @desc    Profile routes
router.route("/my-profile").get(getMyProfile).put(updateMyProfile);

// @desc    Availability routes
router.put(
  "/availability",
  [
    body("isOnline").isBoolean().withMessage("isOnline must be boolean"),
    body("latitude")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Valid latitude is required"),
    body("longitude")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Valid longitude is required"),
  ],
  updateAvailability
);

// @desc    Order management routes
router.get("/available-orders", getAvailableOrders);
router.post("/accept-order/:orderId", acceptOrder);
router.get("/active-orders", getActiveOrders);
router.get("/delivery-history", getDeliveryHistory);

// @desc    Statistics route
router.get("/stats", getMyStats);

// @desc    Admin routes
router.get("/", admin, getDeliveryPartners);
router.put(
  "/:id/approval",
  admin,
  [body("isApproved").isBoolean().withMessage("isApproved must be boolean")],
  updateApprovalStatus
);

export default router;
