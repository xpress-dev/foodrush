import express from "express";
import { body } from "express-validator";
import {
  createMenuItem,
  getMenuItems,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getMyMenuItems,
  bulkUpdateMenuItems,
  getPopularMenuItems,
  searchMenuItems,
} from "../controllers/menuItemController.js";
import { protect, restaurantOwner } from "../middleware/auth.js";

const router = express.Router();

// @desc    Public routes
router.get("/", getMenuItems);
router.get("/popular", getPopularMenuItems);
router.get("/search", searchMenuItems);
router.get("/:id", getMenuItem);

// @desc    Protected routes
router.use(protect);

// @desc    Restaurant owner routes
router.post(
  "/",
  restaurantOwner,
  [
    body("name").notEmpty().withMessage("Menu item name is required"),
    body("price").isNumeric().withMessage("Valid price is required"),
    body("category").notEmpty().withMessage("Category is required"),
    body("restaurant")
      .optional()
      .isMongoId()
      .withMessage("Valid restaurant ID is required"),
  ],
  createMenuItem
);

router.get("/my/items", restaurantOwner, getMyMenuItems);

router.put(
  "/bulk-update",
  restaurantOwner,
  [body("items").isArray({ min: 1 }).withMessage("Items array is required")],
  bulkUpdateMenuItems
);

router
  .route("/:id")
  .put(restaurantOwner, updateMenuItem)
  .delete(restaurantOwner, deleteMenuItem);

router.put("/:id/availability", restaurantOwner, toggleMenuItemAvailability);

export default router;
