import asyncHandler from "express-async-handler";
import { Category, MenuItem } from "../models/index.js";
import { formatResponse, getPaginationMeta } from "../utils/helpers.js";

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);

  res
    .status(201)
    .json(formatResponse(true, "Category created successfully", { category }));
});

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = {};

  // Filter by active status
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  } else {
    query.isActive = true; // Default to active categories only
  }

  // Search by name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
  }

  const categories = await Category.find(query)
    .sort({ sortOrder: 1, name: 1 })
    .limit(limit)
    .skip(skip);

  const total = await Category.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Categories retrieved successfully",
      { categories },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json(formatResponse(false, "Category not found"));
  }

  res.json(
    formatResponse(true, "Category retrieved successfully", { category })
  );
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json(formatResponse(false, "Category not found"));
  }

  Object.assign(category, req.body);
  const updatedCategory = await category.save();

  res.json(
    formatResponse(true, "Category updated successfully", {
      category: updatedCategory,
    })
  );
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json(formatResponse(false, "Category not found"));
  }

  // Check if category has menu items
  const menuItemsCount = await MenuItem.countDocuments({
    category: req.params.id,
  });

  if (menuItemsCount > 0) {
    return res
      .status(400)
      .json(
        formatResponse(false, "Cannot delete category with existing menu items")
      );
  }

  await Category.findByIdAndDelete(req.params.id);

  res.json(formatResponse(true, "Category deleted successfully"));
});

// @desc    Toggle category status
// @route   PUT /api/categories/:id/toggle-status
// @access  Private/Admin
export const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json(formatResponse(false, "Category not found"));
  }

  category.isActive = !category.isActive;
  await category.save();

  res.json(
    formatResponse(
      true,
      `Category ${
        category.isActive ? "activated" : "deactivated"
      } successfully`,
      { category }
    )
  );
});

// @desc    Get categories with menu items count
// @route   GET /api/categories/with-counts
// @access  Public
export const getCategoriesWithCounts = asyncHandler(async (req, res) => {
  const categories = await Category.aggregate([
    {
      $match: { isActive: true },
    },
    {
      $lookup: {
        from: "menuitems",
        localField: "_id",
        foreignField: "category",
        as: "menuItems",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        image: 1,
        sortOrder: 1,
        menuItemsCount: {
          $size: {
            $filter: {
              input: "$menuItems",
              as: "item",
              cond: { $eq: ["$$item.isAvailable", true] },
            },
          },
        },
      },
    },
    {
      $match: {
        menuItemsCount: { $gt: 0 },
      },
    },
    {
      $sort: { sortOrder: 1, name: 1 },
    },
  ]);

  res.json(
    formatResponse(true, "Categories with counts retrieved successfully", {
      categories,
    })
  );
});

// @desc    Update category sort order
// @route   PUT /api/categories/update-sort-order
// @access  Private/Admin
export const updateCategorySortOrder = asyncHandler(async (req, res) => {
  const { categories } = req.body; // Array of { id, sortOrder }

  if (!Array.isArray(categories)) {
    return res
      .status(400)
      .json(formatResponse(false, "Categories array is required"));
  }

  const updatePromises = categories.map(({ id, sortOrder }) =>
    Category.findByIdAndUpdate(id, { sortOrder }, { new: true })
  );

  const updatedCategories = await Promise.all(updatePromises);

  res.json(
    formatResponse(true, "Category sort order updated successfully", {
      categories: updatedCategories,
    })
  );
});

// @desc    Get popular categories
// @route   GET /api/categories/popular
// @access  Public
export const getPopularCategories = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;

  const popularCategories = await Category.aggregate([
    {
      $match: { isActive: true },
    },
    {
      $lookup: {
        from: "menuitems",
        localField: "_id",
        foreignField: "category",
        as: "menuItems",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        image: 1,
        totalOrders: {
          $sum: "$menuItems.totalOrders",
        },
        menuItemsCount: {
          $size: {
            $filter: {
              input: "$menuItems",
              as: "item",
              cond: { $eq: ["$$item.isAvailable", true] },
            },
          },
        },
      },
    },
    {
      $match: {
        menuItemsCount: { $gt: 0 },
      },
    },
    {
      $sort: { totalOrders: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  res.json(
    formatResponse(true, "Popular categories retrieved successfully", {
      categories: popularCategories,
    })
  );
});
