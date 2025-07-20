import asyncHandler from "express-async-handler";
import { Restaurant, MenuItem, User } from "../models/index.js";
import {
  formatResponse,
  calculateDistance,
  getPagination,
  getPaginationMeta,
} from "../utils/helpers.js";

// @desc    Create restaurant
// @route   POST /api/restaurants
// @access  Private/Restaurant Owner
export const createRestaurant = asyncHandler(async (req, res) => {
  // Check if user already has a restaurant
  const existingRestaurant = await Restaurant.findOne({ owner: req.user._id });

  if (existingRestaurant) {
    return res
      .status(400)
      .json(formatResponse(false, "You already have a restaurant registered"));
  }

  const restaurantData = { ...req.body, owner: req.user._id };
  const restaurant = await Restaurant.create(restaurantData);

  res
    .status(201)
    .json(
      formatResponse(true, "Restaurant created successfully", { restaurant })
    );
});

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
export const getRestaurants = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Build query
  let query = { isActive: true, isVerified: true };

  // Search by name or cuisine
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { cuisine: { $in: [new RegExp(req.query.search, "i")] } },
    ];
  }

  // Filter by cuisine
  if (req.query.cuisine) {
    query.cuisine = { $in: req.query.cuisine.split(",") };
  }

  // Filter by rating
  if (req.query.minRating) {
    query["rating.average"] = { $gte: parseFloat(req.query.minRating) };
  }

  // Sort options
  let sort = { createdAt: -1 };
  if (req.query.sort) {
    switch (req.query.sort) {
      case "rating":
        sort = { "rating.average": -1 };
        break;
      case "orders":
        sort = { totalOrders: -1 };
        break;
      case "name":
        sort = { name: 1 };
        break;
      case "deliveryTime":
        sort = { "deliveryTime.min": 1 };
        break;
    }
  }

  const restaurants = await Restaurant.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .select("-bankDetails -businessLicense -gstNumber");

  const total = await Restaurant.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Restaurants retrieved successfully",
      { restaurants },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Get nearby restaurants
// @route   GET /api/restaurants/nearby
// @access  Public
export const getNearbyRestaurants = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 10 } = req.query;

  if (!latitude || !longitude) {
    return res
      .status(400)
      .json(formatResponse(false, "Latitude and longitude are required"));
  }

  const restaurants = await Restaurant.find({
    isActive: true,
    isVerified: true,
    "address.coordinates.latitude": { $exists: true },
    "address.coordinates.longitude": { $exists: true },
  }).select("-bankDetails -businessLicense -gstNumber");

  // Filter by distance
  const nearbyRestaurants = restaurants
    .filter((restaurant) => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        restaurant.address.coordinates.latitude,
        restaurant.address.coordinates.longitude
      );
      return distance <= parseFloat(radius);
    })
    .map((restaurant) => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        restaurant.address.coordinates.latitude,
        restaurant.address.coordinates.longitude
      );
      return {
        ...restaurant.toObject(),
        distance: Math.round(distance * 10) / 10,
      };
    });

  // Sort by distance
  nearbyRestaurants.sort((a, b) => a.distance - b.distance);

  res.json(
    formatResponse(true, "Nearby restaurants retrieved successfully", {
      restaurants: nearbyRestaurants,
    })
  );
});

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
export const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id)
    .populate("owner", "name email phoneNumber")
    .select("-bankDetails -businessLicense -gstNumber");

  if (!restaurant) {
    return res.status(404).json(formatResponse(false, "Restaurant not found"));
  }

  res.json(
    formatResponse(true, "Restaurant retrieved successfully", { restaurant })
  );
});

// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private/Restaurant Owner
export const updateRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return res.status(404).json(formatResponse(false, "Restaurant not found"));
  }

  // Check if user owns this restaurant or is admin
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  Object.assign(restaurant, req.body);
  const updatedRestaurant = await restaurant.save();

  res.json(
    formatResponse(true, "Restaurant updated successfully", {
      restaurant: updatedRestaurant,
    })
  );
});

// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private/Restaurant Owner
export const deleteRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return res.status(404).json(formatResponse(false, "Restaurant not found"));
  }

  // Check ownership or admin
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  // Soft delete by setting inactive
  restaurant.isActive = false;
  await restaurant.save();

  res.json(formatResponse(true, "Restaurant deleted successfully"));
});

// @desc    Get restaurant menu
// @route   GET /api/restaurants/:id/menu
// @access  Public
export const getRestaurantMenu = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return res.status(404).json(formatResponse(false, "Restaurant not found"));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = { restaurant: req.params.id, isAvailable: true };

  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Search by name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
  }

  // Filter by dietary preferences
  if (req.query.dietary) {
    query.dietary = { $in: req.query.dietary.split(",") };
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
    }
  }

  const menuItems = await MenuItem.find(query)
    .populate("category", "name")
    .sort(sort)
    .limit(limit)
    .skip(skip);

  const total = await MenuItem.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Menu retrieved successfully",
      { menuItems },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Get my restaurant (for restaurant owners)
// @route   GET /api/restaurants/my-restaurant
// @access  Private/Restaurant Owner
export const getMyRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id });

  if (!restaurant) {
    return res
      .status(404)
      .json(formatResponse(false, "No restaurant found for your account"));
  }

  res.json(
    formatResponse(true, "Restaurant retrieved successfully", { restaurant })
  );
});

// @desc    Update restaurant status (online/offline)
// @route   PUT /api/restaurants/:id/status
// @access  Private/Restaurant Owner
export const updateRestaurantStatus = asyncHandler(async (req, res) => {
  const { isCurrentlyOpen } = req.body;

  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return res.status(404).json(formatResponse(false, "Restaurant not found"));
  }

  // Check ownership
  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  restaurant.isCurrentlyOpen = isCurrentlyOpen;
  await restaurant.save();

  res.json(
    formatResponse(
      true,
      `Restaurant marked as ${isCurrentlyOpen ? "open" : "closed"}`,
      { restaurant }
    )
  );
});

// @desc    Get restaurant statistics
// @route   GET /api/restaurants/:id/stats
// @access  Private/Restaurant Owner
export const getRestaurantStats = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);

  if (!restaurant) {
    return res.status(404).json(formatResponse(false, "Restaurant not found"));
  }

  // Check ownership
  if (restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  // Get menu items count
  const totalMenuItems = await MenuItem.countDocuments({
    restaurant: req.params.id,
  });
  const activeMenuItems = await MenuItem.countDocuments({
    restaurant: req.params.id,
    isAvailable: true,
  });

  const stats = {
    totalOrders: restaurant.totalOrders,
    averageRating: restaurant.rating.average,
    totalRatings: restaurant.rating.count,
    totalMenuItems,
    activeMenuItems,
    deliveryRadius: restaurant.deliveryRadius,
    isCurrentlyOpen: restaurant.isCurrentlyOpen,
  };

  res.json(
    formatResponse(true, "Restaurant statistics retrieved successfully", {
      stats,
    })
  );
});
