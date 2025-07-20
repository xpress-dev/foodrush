import express from "express";
import { body } from "express-validator";
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getCategoriesWithCounts,
  updateCategorySortOrder,
  getPopularCategories,
} from "../controllers/categoryController.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

// @desc    Public routes
router.get("/", getCategories);
router.get("/with-counts", getCategoriesWithCounts);
router.get("/popular", getPopularCategories);
router.get("/:id", getCategory);

// @desc    Protected routes (Admin only)
router.use(protect);
router.use(admin);

router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Category name is required"),
    body("name")
      .isLength({ max: 50 })
      .withMessage("Category name cannot exceed 50 characters"),
  ],
  createCategory
);

router.route("/:id").put(updateCategory).delete(deleteCategory);

router.put("/:id/toggle-status", toggleCategoryStatus);

router.put(
  "/update-sort-order",
  [body("categories").isArray().withMessage("Categories array is required")],
  updateCategorySortOrder
);

export default router;
