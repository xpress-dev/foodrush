import asyncHandler from "express-async-handler";
import {
  Order,
  MenuItem,
  Restaurant,
  Address,
  User,
  DeliveryPartner,
} from "../models/index.js";
import {
  formatResponse,
  generateOTP,
  getPaginationMeta,
} from "../utils/helpers.js";

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Customer
export const createOrder = asyncHandler(async (req, res) => {
  const {
    restaurant,
    items,
    deliveryAddress,
    paymentMethod,
    specialInstructions,
  } = req.body;

  // Verify restaurant exists and is active
  const restaurantData = await Restaurant.findById(restaurant);
  if (!restaurantData || !restaurantData.isActive) {
    return res
      .status(400)
      .json(formatResponse(false, "Restaurant not available"));
  }

  // Verify delivery address belongs to user
  const address = await Address.findOne({
    _id: deliveryAddress,
    user: req.user._id,
  });
  if (!address) {
    return res
      .status(400)
      .json(formatResponse(false, "Invalid delivery address"));
  }

  // Verify and calculate order items
  let subtotal = 0;
  const orderItems = [];

  for (let item of items) {
    const menuItem = await MenuItem.findById(item.menuItem);
    if (!menuItem || !menuItem.isAvailable) {
      return res
        .status(400)
        .json(
          formatResponse(
            false,
            `Menu item ${menuItem?.name || "not found"} is not available`
          )
        );
    }

    let itemPrice = menuItem.price;
    let itemTotal = 0;

    // Calculate variant price
    if (item.variant) {
      const variant = menuItem.variants.find(
        (v) => v.name === item.variant.name
      );
      if (variant) {
        itemPrice = variant.discountedPrice || variant.price;
      }
    }

    // Calculate base item total
    itemTotal = itemPrice * item.quantity;

    // Add add-ons
    if (item.addOns && item.addOns.length > 0) {
      for (let addOn of item.addOns) {
        const menuAddOn = menuItem.addOns.find((a) => a.name === addOn.name);
        if (menuAddOn && menuAddOn.isAvailable) {
          itemTotal += menuAddOn.price * item.quantity;
        }
      }
    }

    // Apply customizations
    if (item.customizations && item.customizations.length > 0) {
      for (let customization of item.customizations) {
        for (let option of customization.selectedOptions) {
          itemTotal += (option.priceModifier || 0) * item.quantity;
        }
      }
    }

    orderItems.push({
      menuItem: menuItem._id,
      name: menuItem.name,
      price: itemPrice,
      quantity: item.quantity,
      variant: item.variant,
      addOns: item.addOns || [],
      customizations: item.customizations || [],
      specialInstructions: item.specialInstructions,
      itemTotal,
    });

    subtotal += itemTotal;
  }

  // Check minimum order value
  if (subtotal < restaurantData.minimumOrder) {
    return res
      .status(400)
      .json(
        formatResponse(
          false,
          `Minimum order value is ₹${restaurantData.minimumOrder}`
        )
      );
  }

  // Calculate pricing
  const deliveryFee = restaurantData.deliveryFee || 0;
  const platformFee = Math.round(subtotal * 0.02); // 2% platform fee
  const packagingFee = 10;

  // Calculate taxes (assuming 5% GST)
  const taxRate = 0.05;
  const cgst = Math.round(((subtotal * taxRate) / 2) * 100) / 100;
  const sgst = Math.round(((subtotal * taxRate) / 2) * 100) / 100;

  const total =
    subtotal + deliveryFee + platformFee + packagingFee + cgst + sgst;

  // Calculate estimated delivery time
  const estimatedDeliveryTime = new Date();
  estimatedDeliveryTime.setMinutes(
    estimatedDeliveryTime.getMinutes() +
      (restaurantData.deliveryTime.min + restaurantData.deliveryTime.max) / 2
  );

  // Generate OTP for delivery
  const otpCode = generateOTP(4);
  const otpExpiresAt = new Date();
  otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 30); // OTP valid for 30 minutes

  // Create order
  const order = await Order.create({
    customer: req.user._id,
    restaurant: restaurant,
    items: orderItems,
    deliveryAddress: deliveryAddress,
    paymentMethod,
    specialInstructions,
    pricing: {
      subtotal,
      deliveryFee,
      taxes: { cgst, sgst, igst: 0 },
      platformFee,
      packagingFee,
      total,
    },
    estimatedDeliveryTime,
    otp: {
      code: otpCode,
      expiresAt: otpExpiresAt,
    },
  });

  // Populate order details
  const populatedOrder = await Order.findById(order._id)
    .populate("customer", "name phoneNumber")
    .populate("restaurant", "name phoneNumber address")
    .populate("deliveryAddress")
    .populate("items.menuItem", "name images");

  res
    .status(201)
    .json(
      formatResponse(true, "Order created successfully", {
        order: populatedOrder,
      })
    );
});

// @desc    Get user orders
// @route   GET /api/orders/my-orders
// @access  Private/Customer
export const getMyOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = { customer: req.user._id };

  // Filter by status
  if (req.query.status) {
    query.orderStatus = req.query.status;
  }

  const orders = await Order.find(query)
    .populate("restaurant", "name images cuisine")
    .populate("deliveryAddress")
    .populate("deliveryPartner", "user")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Order.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Orders retrieved successfully",
      { orders },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("customer", "name phoneNumber email")
    .populate("restaurant", "name phoneNumber address images")
    .populate("deliveryAddress")
    .populate("deliveryPartner", "user vehicleInfo")
    .populate("items.menuItem", "name images");

  if (!order) {
    return res.status(404).json(formatResponse(false, "Order not found"));
  }

  // Check if user has access to this order
  const hasAccess =
    order.customer._id.toString() === req.user._id.toString() ||
    order.restaurant.owner?.toString() === req.user._id.toString() ||
    order.deliveryPartner?.user?.toString() === req.user._id.toString() ||
    req.user.role === "admin";

  if (!hasAccess) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  res.json(formatResponse(true, "Order retrieved successfully", { order }));
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;

  const order = await Order.findById(req.params.id)
    .populate("restaurant", "owner")
    .populate("deliveryPartner", "user");

  if (!order) {
    return res.status(404).json(formatResponse(false, "Order not found"));
  }

  // Check permissions for status updates
  const canUpdate =
    req.user.role === "admin" ||
    order.restaurant.owner?.toString() === req.user._id.toString() ||
    order.deliveryPartner?.user?.toString() === req.user._id.toString() ||
    (status === "cancelled" &&
      order.customer.toString() === req.user._id.toString());

  if (!canUpdate) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  // Validate status transitions
  const validTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
    refunded: [],
  };

  if (!validTransitions[order.orderStatus].includes(status)) {
    return res
      .status(400)
      .json(
        formatResponse(
          false,
          `Cannot change status from ${order.orderStatus} to ${status}`
        )
      );
  }

  order.orderStatus = status;

  // Handle cancellation
  if (status === "cancelled") {
    order.cancellationReason = "customer_request"; // or other reasons
    order.cancellationDetails = {
      reason: reason || "No reason provided",
      cancelledBy: req.user.role,
      refundAmount: order.pricing.total,
      refundStatus: "pending",
    };
  }

  // Set delivery time for delivered orders
  if (status === "delivered") {
    order.actualDeliveryTime = new Date();
  }

  await order.save();

  res.json(
    formatResponse(true, "Order status updated successfully", { order })
  );
});

// @desc    Assign delivery partner to order
// @route   PUT /api/orders/:id/assign-delivery
// @access  Private/Restaurant Owner
export const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId } = req.body;

  const order = await Order.findById(req.params.id).populate(
    "restaurant",
    "owner"
  );

  if (!order) {
    return res.status(404).json(formatResponse(false, "Order not found"));
  }

  // Check if user owns the restaurant
  if (
    order.restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  // Verify delivery partner exists and is available
  const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId);
  if (!deliveryPartner || !deliveryPartner.availability.isOnline) {
    return res
      .status(400)
      .json(formatResponse(false, "Delivery partner not available"));
  }

  order.deliveryPartner = deliveryPartnerId;
  await order.save();

  res.json(
    formatResponse(true, "Delivery partner assigned successfully", { order })
  );
});

// @desc    Get restaurant orders
// @route   GET /api/orders/restaurant-orders
// @access  Private/Restaurant Owner
export const getRestaurantOrders = asyncHandler(async (req, res) => {
  // Find user's restaurant
  const restaurant = await Restaurant.findOne({ owner: req.user._id });
  if (!restaurant) {
    return res
      .status(404)
      .json(formatResponse(false, "No restaurant found for your account"));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = { restaurant: restaurant._id };

  // Filter by status
  if (req.query.status) {
    query.orderStatus = req.query.status;
  }

  // Filter by date range
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) {
      query.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  const orders = await Order.find(query)
    .populate("customer", "name phoneNumber")
    .populate("deliveryAddress")
    .populate("deliveryPartner", "user")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Order.countDocuments(query);

  res.json(
    formatResponse(
      true,
      "Restaurant orders retrieved successfully",
      { orders },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json(formatResponse(false, "Order not found"));
  }

  // Check if user can cancel this order
  const canCancel =
    order.customer.toString() === req.user._id.toString() ||
    req.user.role === "admin";

  if (!canCancel) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  // Check if order can be cancelled
  const cancellableStatuses = ["pending", "confirmed", "preparing"];
  if (!cancellableStatuses.includes(order.orderStatus)) {
    return res
      .status(400)
      .json(formatResponse(false, "Order cannot be cancelled at this stage"));
  }

  order.orderStatus = "cancelled";
  order.cancellationReason = "customer_request";
  order.cancellationDetails = {
    reason: reason || "Customer requested cancellation",
    cancelledBy: "customer",
    refundAmount: order.pricing.total,
    refundStatus: "pending",
  };

  await order.save();

  res.json(formatResponse(true, "Order cancelled successfully", { order }));
});

// @desc    Verify delivery OTP
// @route   POST /api/orders/:id/verify-otp
// @access  Private/Delivery Partner
export const verifyDeliveryOTP = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json(formatResponse(false, "Order not found"));
  }

  // Check if OTP is valid and not expired
  if (order.otp.code !== otp || new Date() > order.otp.expiresAt) {
    return res
      .status(400)
      .json(formatResponse(false, "Invalid or expired OTP"));
  }

  // Mark order as delivered
  order.orderStatus = "delivered";
  order.actualDeliveryTime = new Date();
  order.otp = undefined; // Remove OTP after successful verification

  await order.save();

  res.json(formatResponse(true, "Order delivered successfully", { order }));
});

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Restaurant Owner
export const getOrderStats = asyncHandler(async (req, res) => {
  let query = {};

  // If restaurant owner, filter by their restaurant
  if (req.user.role === "restaurant_owner") {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res
        .status(404)
        .json(formatResponse(false, "No restaurant found for your account"));
    }
    query.restaurant = restaurant._id;
  } else if (req.user.role === "customer") {
    query.customer = req.user._id;
  }

  // Date range filter
  const dateRange = {
    startDate:
      req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: req.query.endDate || new Date(),
  };

  query.createdAt = {
    $gte: new Date(dateRange.startDate),
    $lte: new Date(dateRange.endDate),
  };

  const [
    totalOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue,
    averageOrderValue,
  ] = await Promise.all([
    Order.countDocuments(query),
    Order.countDocuments({ ...query, orderStatus: "delivered" }),
    Order.countDocuments({ ...query, orderStatus: "cancelled" }),
    Order.aggregate([
      { $match: { ...query, orderStatus: "delivered" } },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } },
    ]),
    Order.aggregate([
      { $match: { ...query, orderStatus: "delivered" } },
      { $group: { _id: null, average: { $avg: "$pricing.total" } } },
    ]),
  ]);

  const stats = {
    totalOrders,
    completedOrders,
    cancelledOrders,
    completionRate:
      totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
    totalRevenue: totalRevenue[0]?.total || 0,
    averageOrderValue: Math.round(averageOrderValue[0]?.average || 0),
  };

  res.json(
    formatResponse(true, "Order statistics retrieved successfully", { stats })
  );
});
