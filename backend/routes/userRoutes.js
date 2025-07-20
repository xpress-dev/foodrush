import express from "express";
import { body } from "express-validator";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUsers,
  deleteUser,
  addAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/userController.js";
import { protect, admin, customer } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";

const router = express.Router();

// @desc    Register & Login routes
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("phoneNumber").notEmpty().withMessage("Phone number is required"),
    body("role")
      .optional()
      .isIn(["customer", "restaurant_owner"])
      .withMessage("Invalid role"),
    validateRequest,
  ],
  registerUser
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validateRequest,
  ],
  loginUser
);

// @desc    Protected routes
router.use(protect); // All routes below require authentication

// @desc    User profile routes
router
  .route("/profile")
  .get(getUserProfile)
  .put(
    [
      body("name").optional().notEmpty().withMessage("Name cannot be empty"),
      body("email").optional().isEmail().withMessage("Valid email is required"),
      body("phoneNumber")
        .optional()
        .notEmpty()
        .withMessage("Phone number cannot be empty"),
    ],
    updateUserProfile
  );

router.put(
  "/change-password",
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  changePassword
);

// @desc    Address routes
router
  .route("/addresses")
  .get(getUserAddresses)
  .post(
    [
      body("addressLine1").notEmpty().withMessage("Address line 1 is required"),
      body("city").notEmpty().withMessage("City is required"),
      body("state").notEmpty().withMessage("State is required"),
      body("postalCode")
        .matches(/^[0-9]{5,6}$/)
        .withMessage("Valid postal code is required"),
    ],
    addAddress
  );

router.route("/addresses/:id").put(updateAddress).delete(deleteAddress);

router.put("/addresses/:id/default", setDefaultAddress);

// @desc    Admin only routes
router.get("/", admin, getUsers);
router.delete("/:id", admin, deleteUser);

export default router;
