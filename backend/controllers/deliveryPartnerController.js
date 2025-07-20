import asyncHandler from "express-async-handler";
import { DeliveryPartner, Order, User } from "../models/index.js";
import { formatResponse, getPaginationMeta } from "../utils/helpers.js";

// @desc    Apply to become delivery partner
// @route   POST /api/delivery-partners/apply
// @access  Private
export const applyDeliveryPartner = asyncHandler(async (req, res) => {
  // Check if user already has a delivery partner profile
  const existingProfile = await DeliveryPartner.findOne({ user: req.user._id });

  if (existingProfile) {
    return res
      .status(400)
      .json(formatResponse(false, "Delivery partner profile already exists"));
  }

  const deliveryPartner = await DeliveryPartner.create({
    user: req.user._id,
    ...req.body,
  });

  res
    .status(201)
    .json(
      formatResponse(
        true,
        "Delivery partner application submitted successfully",
        { deliveryPartner }
      )
    );
});

// @desc    Get my delivery partner profile
// @route   GET /api/delivery-partners/my-profile
// @access  Private/Delivery Partner
export const getMyProfile = asyncHandler(async (req, res) => {
  const deliveryPartner = await DeliveryPartner.findOne({
    user: req.user._id,
  }).populate("user", "name email phoneNumber avatar");

  if (!deliveryPartner) {
    return res
      .status(404)
      .json(formatResponse(false, "Delivery partner profile not found"));
  }

  res.json(
    formatResponse(true, "Profile retrieved successfully", { deliveryPartner })
  );
});

// @desc    Update delivery partner profile
// @route   PUT /api/delivery-partners/my-profile
// @access  Private/Delivery Partner
export const updateMyProfile = asyncHandler(async (req, res) => {
  const deliveryPartner = await DeliveryPartner.findOne({ user: req.user._id });

  if (!deliveryPartner) {
    return res
      .status(404)
      .json(formatResponse(false, "Delivery partner profile not found"));
  }

  Object.assign(deliveryPartner, req.body);
  const updatedProfile = await deliveryPartner.save();

  res.json(
    formatResponse(true, "Profile updated successfully", {
      deliveryPartner: updatedProfile,
    })
  );
});

// @desc    Update availability status
// @route   PUT /api/delivery-partners/availability
// @access  Private/Delivery Partner
export const updateAvailability = asyncHandler(async (req, res) => {
  const { isOnline, latitude, longitude } = req.body;

  const deliveryPartner = await DeliveryPartner.findOne({ user: req.user._id });

  if (!deliveryPartner) {
    return res
      .status(404)
      .json(formatResponse(false, "Delivery partner profile not found"));
  }

  if (!deliveryPartner.verificationStatus.isApproved) {
    return res
      .status(400)
      .json(formatResponse(false, "Profile not approved yet"));
  }

  deliveryPartner.availability.isOnline = isOnline;

  if (latitude && longitude) {
    deliveryPartner.availability.currentLocation = {
      latitude,
      longitude,
      lastUpdated: new Date(),
    };
  }

  await deliveryPartner.save();

  res.json(
    formatResponse(
      true,
      `Status updated to ${isOnline ? "online" : "offline"}`,
      { deliveryPartner }
    )
  );
});

// @desc    Get available orders
// @route   GET /api/delivery-partners/available-orders
// @access  Private/Delivery Partner
export const getAvailableOrders = asyncHandler(async (req, res) => {
  const deliveryPartner = await DeliveryPartner.findOne({ user: req.user._id });

  if (!deliveryPartner || !deliveryPartner.verificationStatus.isApproved) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  // Find orders that need delivery partners
  const orders = await Order.find({
    orderStatus: "ready_for_pickup",
    deliveryPartner: { $exists: false },
  })
    .populate("restaurant", "name address phoneNumber")
    .populate("customer", "name phoneNumber")
    .populate("deliveryAddress")
    .sort({ createdAt: 1 })
    .limit(20);

  res.json(
    formatResponse(true, "Available orders retrieved successfully", { orders })
  );
});

// @desc    Accept delivery order
// @route   POST /api/delivery-partners/accept-order/:orderId
// @access  Private/Delivery Partner
export const acceptOrder = asyncHandler(async (req, res) => {
  const deliveryPartner = await DeliveryPartner.findOne({ user: req.user._id });

  if (!deliveryPartner || !deliveryPartner.availability.isOnline) {
    return res
      .status(400)
      .json(formatResponse(false, "You must be online to accept orders"));
  }

  // Check if partner already has an active order
  if (deliveryPartner.currentOrder) {
    return res
      .status(400)
      .json(formatResponse(false, "You already have an active order"));
  }

  const order = await Order.findById(req.params.orderId);

  if (
    !order ||
    order.orderStatus !== "ready_for_pickup" ||
    order.deliveryPartner
  ) {
    return res
      .status(400)
      .json(formatResponse(false, "Order not available for pickup"));
  }

  // Assign delivery partner to order
  order.deliveryPartner = deliveryPartner._id;
  order.orderStatus = "out_for_delivery";
  await order.save();

  // Update delivery partner's current order
  deliveryPartner.currentOrder = order._id;
  deliveryPartner.statistics.totalOrders += 1;
  await deliveryPartner.save();

  await order.populate([
    { path: "restaurant", select: "name address phoneNumber" },
    { path: "customer", select: "name phoneNumber" },
    { path: "deliveryAddress" },
  ]);

  res.json(formatResponse(true, "Order accepted successfully", { order }));
});

// @desc    Get my active orders
// @route   GET /api/delivery-partners/active-orders
// @access  Private/Delivery Partner
export const getActiveOrders = asyncHandler(async (req, res) => {
  const deliveryPartner = await DeliveryPartner.findOne({ user: req.user._id });

  if (!deliveryPartner) {
    return res
      .status(404)
      .json(formatResponse(false, "Delivery partner profile not found"));
  }

  const activeOrders = await Order.find({
    deliveryPartner: deliveryPartner._id,
    orderStatus: { $in: ["out_for_delivery"] },
  })
    .populate("restaurant", "name address phoneNumber")
    .populate("customer", "name phoneNumber")
    .populate("deliveryAddress")
    .sort({ createdAt: -1 });

  res.json(
    formatResponse(true, "Active orders retrieved successfully", {
      orders: activeOrders,
    })
  );
});

// @desc    Get delivery history
// @route   GET /api/delivery-partners/delivery-history
// @access  Private/Delivery Partner
export const getDeliveryHistory = asyncHandler(async (req, res) => {
  const deliveryPartner = await DeliveryPartner.findOne({ user: req.user._id });

  if (!deliveryPartner) {
    return res
      .status(404)
      .json(formatResponse(false, "Delivery partner profile not found"));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const orders = await Order.find({
    deliveryPartner: deliveryPartner._id,
    orderStatus: { $in: ["delivered", "cancelled"] },
  })
    .populate("restaurant", "name")
    .populate("customer", "name")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Order.countDocuments({
    deliveryPartner: deliveryPartner._id,
    orderStatus: { $in: ["delivered", "cancelled"] },
  });

  res.json(
    formatResponse(
      true,
      "Delivery history retrieved successfully",
      { orders },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Get delivery partner statistics
// @route   GET /api/delivery-partners/stats
// @access  Private/Delivery Partner
export const getMyStats = asyncHandler(async (req, res) => {
  const deliveryPartner = await DeliveryPartner.findOne({ user: req.user._id });

  if (!deliveryPartner) {
    return res
      .status(404)
      .json(formatResponse(false, "Delivery partner profile not found"));
  }

  const stats = {
    totalOrders: deliveryPartner.statistics.totalOrders,
    completedOrders: deliveryPartner.statistics.completedOrders,
    cancelledOrders: deliveryPartner.statistics.cancelledOrders,
    completionRate: deliveryPartner.statistics.completionRate,
    averageRating: deliveryPartner.statistics.rating.average,
    totalRatings: deliveryPartner.statistics.rating.count,
    totalEarnings: deliveryPartner.statistics.totalEarnings,
    averageDeliveryTime: deliveryPartner.statistics.averageDeliveryTime,
    isOnline: deliveryPartner.availability.isOnline,
    joiningDate: deliveryPartner.joiningDate,
  };

  res.json(
    formatResponse(true, "Statistics retrieved successfully", { stats })
  );
});

// @desc    Get all delivery partners (Admin only)
// @route   GET /api/delivery-partners
// @access  Private/Admin
export const getDeliveryPartners = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {};

  // Filter by verification status
  if (req.query.isApproved !== undefined) {
    query["verificationStatus.isApproved"] = req.query.isApproved === "true";
  }

  // Filter by online status
  if (req.query.isOnline !== undefined) {
    query["availability.isOnline"] = req.query.isOnline === "true";
  }

  // Filter by city
  if (req.query.city) {
    query["workingAreas.city"] = req.query.city;
  }

  const deliveryPartners = await DeliveryPartner.find(query)
    .populate("user", "name email phoneNumber")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await DeliveryPartner.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Delivery partners retrieved successfully",
      { deliveryPartners },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Approve/reject delivery partner (Admin only)
// @route   PUT /api/delivery-partners/:id/approval
// @access  Private/Admin
export const updateApprovalStatus = asyncHandler(async (req, res) => {
  const { isApproved, reason } = req.body;

  const deliveryPartner = await DeliveryPartner.findById(req.params.id);

  if (!deliveryPartner) {
    return res
      .status(404)
      .json(formatResponse(false, "Delivery partner not found"));
  }

  deliveryPartner.verificationStatus.isApproved = isApproved;
  if (isApproved) {
    deliveryPartner.verificationStatus.verifiedAt = new Date();
    deliveryPartner.verificationStatus.verifiedBy = req.user._id;
  }

  await deliveryPartner.save();

  res.json(
    formatResponse(
      true,
      `Delivery partner ${isApproved ? "approved" : "rejected"}`,
      { deliveryPartner }
    )
  );
});
