import asyncHandler from "express-async-handler";
import { MenuItem, Restaurant, Category } from "../models/index.js";
import {
  formatResponse,
  getPagination,
  getPaginationMeta,
  calculateDistance,
} from "../utils/helpers.js";

// @desc    Create menu item
// @route   POST /api/menu-items
// @access  Private/Restaurant Owner
export const createMenuItem = asyncHandler(async (req, res) => {
  const restaurantId = req.body.restaurant || req.restaurant?._id;

  // Verify restaurant ownership
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return res.status(404).json(formatResponse(false, "Restaurant not found"));
  }

  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  const menuItem = await MenuItem.create({
    ...req.body,
    restaurant: restaurantId,
  });
  await menuItem.populate("category", "name");

  res
    .status(201)
    .json(formatResponse(true, "Menu item created successfully", { menuItem }));
});

// @desc    Get all menu items
// @route   GET /api/menu-items
// @access  Public
export const getMenuItems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = { isAvailable: true };

  // Filter by restaurant
  if (req.query.restaurant) {
    query.restaurant = req.query.restaurant;
  }

  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Search by name or description
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } },
    ];
  }

  // Filter by dietary preferences
  if (req.query.dietary) {
    query.dietary = { $in: req.query.dietary.split(",") };
  }

  // Filter by spice level
  if (req.query.spiceLevel) {
    query.spiceLevel = req.query.spiceLevel;
  }

  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
  }

  // Filter by tags
  if (req.query.tags) {
    query.tags = { $in: req.query.tags.split(",") };
  }

  // Sort options
  let sort = { createdAt: -1 };
  if (req.query.sort) {
    switch (req.query.sort) {
      case "price_low":
        sort = { price: 1 };
        break;
      case "price_high":
        sort = { price: -1 };
        break;
      case "rating":
        sort = { "rating.average": -1 };
        break;
      case "popular":
        sort = { totalOrders: -1 };
        break;
      case "name":
        sort = { name: 1 };
        break;
      case "recommended":
        query.isRecommended = true;
        sort = { "rating.average": -1 };
        break;
      case "bestseller":
        query.isBestseller = true;
        sort = { totalOrders: -1 };
        break;
    }
  }

  const menuItems = await MenuItem.find(query)
    .populate("restaurant", "name deliveryTime deliveryFee minimumOrder")
    .populate("category", "name")
    .sort(sort)
    .limit(limit)
    .skip(skip);

  const total = await MenuItem.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Menu items retrieved successfully",
      { menuItems },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Get single menu item
// @route   GET /api/menu-items/:id
// @access  Public
export const getMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id)
    .populate("restaurant", "name rating deliveryTime deliveryFee")
    .populate("category", "name");

  if (!menuItem) {
    return res.status(404).json(formatResponse(false, "Menu item not found"));
  }

  res.json(
    formatResponse(true, "Menu item retrieved successfully", { menuItem })
  );
});

// @desc    Update menu item
// @route   PUT /api/menu-items/:id
// @access  Private/Restaurant Owner
export const updateMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id).populate(
    "restaurant"
  );

  if (!menuItem) {
    return res.status(404).json(formatResponse(false, "Menu item not found"));
  }

  // Check ownership
  if (
    menuItem.restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  Object.assign(menuItem, req.body);
  const updatedMenuItem = await menuItem.save();
  await updatedMenuItem.populate("category", "name");

  res.json(
    formatResponse(true, "Menu item updated successfully", {
      menuItem: updatedMenuItem,
    })
  );
});

// @desc    Delete menu item
// @route   DELETE /api/menu-items/:id
// @access  Private/Restaurant Owner
export const deleteMenuItem = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id).populate(
    "restaurant"
  );

  if (!menuItem) {
    return res.status(404).json(formatResponse(false, "Menu item not found"));
  }

  // Check ownership
  if (
    menuItem.restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  await MenuItem.findByIdAndDelete(req.params.id);

  res.json(formatResponse(true, "Menu item deleted successfully"));
});

// @desc    Toggle menu item availability
// @route   PUT /api/menu-items/:id/availability
// @access  Private/Restaurant Owner
export const toggleMenuItemAvailability = asyncHandler(async (req, res) => {
  const menuItem = await MenuItem.findById(req.params.id).populate(
    "restaurant"
  );

  if (!menuItem) {
    return res.status(404).json(formatResponse(false, "Menu item not found"));
  }

  // Check ownership
  if (menuItem.restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  menuItem.isAvailable = !menuItem.isAvailable;
  await menuItem.save();

  res.json(
    formatResponse(
      true,
      `Menu item marked as ${
        menuItem.isAvailable ? "available" : "unavailable"
      }`,
      { menuItem }
    )
  );
});

// @desc    Get menu items by restaurant (for restaurant owners)
// @route   GET /api/menu-items/my-items
// @access  Private/Restaurant Owner
export const getMyMenuItems = asyncHandler(async (req, res) => {
  // Find user's restaurant
  const restaurant = await Restaurant.findOne({ owner: req.user._id });

  if (!restaurant) {
    return res
      .status(404)
      .json(formatResponse(false, "No restaurant found for your account"));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = { restaurant: restaurant._id };

  // Filter by availability
  if (req.query.isAvailable !== undefined) {
    query.isAvailable = req.query.isAvailable === "true";
  }

  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Search by name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
  }

  const menuItems = await MenuItem.find(query)
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await MenuItem.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Menu items retrieved successfully",
      { menuItems },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Bulk update menu items
// @route   PUT /api/menu-items/bulk-update
// @access  Private/Restaurant Owner
export const bulkUpdateMenuItems = asyncHandler(async (req, res) => {
  const { items } = req.body; // Array of { id, updates }

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json(formatResponse(false, "Items array is required"));
  }

  const restaurant = await Restaurant.findOne({ owner: req.user._id });
  if (!restaurant) {
    return res
      .status(404)
      .json(formatResponse(false, "No restaurant found for your account"));
  }

  const updatePromises = items.map(async ({ id, updates }) => {
    const menuItem = await MenuItem.findOne({
      _id: id,
      restaurant: restaurant._id,
    });

    if (menuItem) {
      Object.assign(menuItem, updates);
      return menuItem.save();
    }
    return null;
  });

  const results = await Promise.all(updatePromises);
  const updatedItems = results.filter((item) => item !== null);

  res.json(
    formatResponse(true, `${updatedItems.length} items updated successfully`, {
      updatedItems,
    })
  );
});

// @desc    Get popular menu items
// @route   GET /api/menu-items/popular
// @access  Public
export const getPopularMenuItems = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const popularItems = await MenuItem.find({
    isAvailable: true,
    totalOrders: { $gt: 0 },
  })
    .populate("restaurant", "name rating deliveryTime")
    .populate("category", "name")
    .sort({ totalOrders: -1, "rating.average": -1 })
    .limit(limit);

  res.json(
    formatResponse(true, "Popular menu items retrieved successfully", {
      menuItems: popularItems,
    })
  );
});

// @desc    Search menu items across all restaurants
// @route   GET /api/menu-items/search
// @access  Public
export const searchMenuItems = asyncHandler(async (req, res) => {
  const { q: searchTerm, latitude, longitude, radius = 10 } = req.query;

  if (!searchTerm) {
    return res
      .status(400)
      .json(formatResponse(false, "Search term is required"));
  }

  let restaurantIds = [];

  // If location is provided, find nearby restaurants first
  if (latitude && longitude) {
    const restaurants = await Restaurant.find({
      isActive: true,
      isVerified: true,
      "address.coordinates.latitude": { $exists: true },
      "address.coordinates.longitude": { $exists: true },
    });

    // Filter by distance
    const nearbyRestaurants = restaurants.filter((restaurant) => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        restaurant.address.coordinates.latitude,
        restaurant.address.coordinates.longitude
      );
      return distance <= parseFloat(radius);
    });

    restaurantIds = nearbyRestaurants.map((r) => r._id);
  }

  let query = {
    isAvailable: true,
    $or: [
      { name: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
      { ingredients: { $in: [new RegExp(searchTerm, "i")] } },
      { tags: { $in: [new RegExp(searchTerm, "i")] } },
    ],
  };

  // Limit to nearby restaurants if location provided
  if (restaurantIds.length > 0) {
    query.restaurant = { $in: restaurantIds };
  }

  const menuItems = await MenuItem.find(query)
    .populate("restaurant", "name rating deliveryTime deliveryFee")
    .populate("category", "name")
    .sort({ "rating.average": -1, totalOrders: -1 })
    .limit(50);

  res.json(
    formatResponse(true, "Search results retrieved successfully", { menuItems })
  );
});
