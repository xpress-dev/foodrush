import asyncHandler from "express-async-handler";
import { Review, Order, Restaurant, MenuItem } from "../models/index.js";
import { formatResponse, getPaginationMeta } from "../utils/helpers.js";

// @desc    Create review
// @route   POST /api/reviews
// @access  Private/Customer
export const createReview = asyncHandler(async (req, res) => {
  const { orderId, ratings, review, images, tags, menuItems } = req.body;

  // Verify order exists and belongs to user
  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json(formatResponse(false, "Order not found"));
  }

  if (order.customer.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  // Check if order is delivered
  if (order.orderStatus !== "delivered") {
    return res
      .status(400)
      .json(formatResponse(false, "Cannot review order that is not delivered"));
  }

  // Check if review already exists for this order
  const existingReview = await Review.findOne({ order: orderId });
  if (existingReview) {
    return res
      .status(400)
      .json(formatResponse(false, "Review already exists for this order"));
  }

  // Create review
  const reviewData = {
    customer: req.user._id,
    order: orderId,
    restaurant: order.restaurant,
    deliveryPartner: order.deliveryPartner,
    ratings,
    review,
    images: images || [],
    tags: tags || [],
    menuItems: menuItems || [],
  };

  const newReview = await Review.create(reviewData);

  // Update order with rating
  order.rating = {
    food: ratings.food,
    delivery: ratings.delivery,
    overall: ratings.overall,
    review,
    ratedAt: new Date(),
  };
  await order.save();

  await newReview.populate([
    { path: "customer", select: "name avatar" },
    { path: "restaurant", select: "name" },
    { path: "menuItems.item", select: "name images" },
  ]);

  res
    .status(201)
    .json(
      formatResponse(true, "Review created successfully", { review: newReview })
    );
});

// @desc    Get restaurant reviews
// @route   GET /api/reviews/restaurant/:restaurantId
// @access  Public
export const getRestaurantReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {
    restaurant: req.params.restaurantId,
    "adminAction.isHidden": { $ne: true },
  };

  // Filter by rating
  if (req.query.minRating) {
    query["ratings.overall"] = { $gte: parseInt(req.query.minRating) };
  }

  // Filter by tags
  if (req.query.tags) {
    query.tags = { $in: req.query.tags.split(",") };
  }

  // Sort options
  let sort = { createdAt: -1 };
  if (req.query.sort) {
    switch (req.query.sort) {
      case "rating_high":
        sort = { "ratings.overall": -1 };
        break;
      case "rating_low":
        sort = { "ratings.overall": 1 };
        break;
      case "helpful":
        sort = { "isHelpful.helpfulCount": -1 };
        break;
    }
  }

  const reviews = await Review.find(query)
    .populate("customer", "name avatar")
    .populate("menuItems.item", "name")
    .sort(sort)
    .limit(limit)
    .skip(skip);

  const total = await Review.countDocuments(query);

  // Get rating distribution
  const ratingDistribution = await Review.aggregate([
    {
      $match: {
        restaurant: req.params.restaurantId,
        "adminAction.isHidden": { $ne: true },
      },
    },
    {
      $group: {
        _id: "$ratings.overall",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  res.json(
    formatResponse(
      true,
      "Reviews retrieved successfully",
      {
        reviews,
        ratingDistribution,
      },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
export const getReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate("customer", "name avatar")
    .populate("restaurant", "name")
    .populate("menuItems.item", "name images");

  if (!review) {
    return res.status(404).json(formatResponse(false, "Review not found"));
  }

  if (review.adminAction.isHidden) {
    return res.status(404).json(formatResponse(false, "Review not available"));
  }

  res.json(formatResponse(true, "Review retrieved successfully", { review }));
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private/Customer
export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json(formatResponse(false, "Review not found"));
  }

  // Check if user owns this review
  if (review.customer.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  // Don't allow updates after 24 hours
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (review.createdAt < dayAgo) {
    return res
      .status(400)
      .json(formatResponse(false, "Reviews cannot be edited after 24 hours"));
  }

  const { ratings, review: reviewText, images, tags, menuItems } = req.body;

  if (ratings) review.ratings = { ...review.ratings, ...ratings };
  if (reviewText !== undefined) review.review = reviewText;
  if (images) review.images = images;
  if (tags) review.tags = tags;
  if (menuItems) review.menuItems = menuItems;

  const updatedReview = await review.save();

  await updatedReview.populate([
    { path: "customer", select: "name avatar" },
    { path: "restaurant", select: "name" },
    { path: "menuItems.item", select: "name images" },
  ]);

  res.json(
    formatResponse(true, "Review updated successfully", {
      review: updatedReview,
    })
  );
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private/Customer
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json(formatResponse(false, "Review not found"));
  }

  // Check if user owns this review or is admin
  if (
    review.customer.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  await Review.findByIdAndDelete(req.params.id);

  res.json(formatResponse(true, "Review deleted successfully"));
});

// @desc    Add restaurant response to review
// @route   POST /api/reviews/:id/response
// @access  Private/Restaurant Owner
export const addRestaurantResponse = asyncHandler(async (req, res) => {
  const { message } = req.body;

  const review = await Review.findById(req.params.id).populate(
    "restaurant",
    "owner"
  );

  if (!review) {
    return res.status(404).json(formatResponse(false, "Review not found"));
  }

  // Check if user owns the restaurant
  if (review.restaurant.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  if (review.restaurantResponse.message) {
    return res
      .status(400)
      .json(formatResponse(false, "Response already exists for this review"));
  }

  review.restaurantResponse = {
    message,
    respondedAt: new Date(),
    respondedBy: req.user._id,
  };

  await review.save();

  res.json(
    formatResponse(true, "Restaurant response added successfully", { review })
  );
});

// @desc    Mark review as helpful/not helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Private
export const markReviewHelpful = asyncHandler(async (req, res) => {
  const { isHelpful } = req.body; // boolean

  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json(formatResponse(false, "Review not found"));
  }

  if (isHelpful) {
    review.isHelpful.helpfulCount += 1;
  } else {
    review.isHelpful.notHelpfulCount += 1;
  }

  await review.save();

  res.json(formatResponse(true, "Review marked successfully", { review }));
});

// @desc    Report review
// @route   POST /api/reviews/:id/report
// @access  Private
export const reportReview = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json(formatResponse(false, "Review not found"));
  }

  review.adminAction.isReported = true;
  review.adminAction.reportReason = reason;

  await review.save();

  res.json(formatResponse(true, "Review reported successfully"));
});

// @desc    Get my reviews
// @route   GET /api/reviews/my-reviews
// @access  Private/Customer
export const getMyReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({ customer: req.user._id })
    .populate("restaurant", "name images")
    .populate("order", "orderNumber createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Review.countDocuments({ customer: req.user._id });

  res.json(
    formatResponse(
      true,
      "Your reviews retrieved successfully",
      { reviews },
      getPaginationMeta(total, page, limit)
    )
  );
});

// @desc    Get review statistics for restaurant
// @route   GET /api/reviews/restaurant/:restaurantId/stats
// @access  Private/Restaurant Owner
export const getReviewStats = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.restaurantId);

  if (!restaurant) {
    return res.status(404).json(formatResponse(false, "Restaurant not found"));
  }

  // Check ownership
  if (
    restaurant.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json(formatResponse(false, "Access denied"));
  }

  const [totalReviews, averageRatings, ratingDistribution, recentReviews] =
    await Promise.all([
      Review.countDocuments({ restaurant: req.params.restaurantId }),

      Review.aggregate([
        { $match: { restaurant: req.params.restaurantId } },
        {
          $group: {
            _id: null,
            avgFood: { $avg: "$ratings.food" },
            avgDelivery: { $avg: "$ratings.delivery" },
            avgService: { $avg: "$ratings.service" },
            avgOverall: { $avg: "$ratings.overall" },
          },
        },
      ]),

      Review.aggregate([
        { $match: { restaurant: req.params.restaurantId } },
        {
          $group: {
            _id: "$ratings.overall",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),

      Review.find({ restaurant: req.params.restaurantId })
        .populate("customer", "name")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

  const stats = {
    totalReviews,
    averageRatings: averageRatings[0] || {
      avgFood: 0,
      avgDelivery: 0,
      avgService: 0,
      avgOverall: 0,
    },
    ratingDistribution,
    recentReviews,
  };

  res.json(
    formatResponse(true, "Review statistics retrieved successfully", { stats })
  );
});
