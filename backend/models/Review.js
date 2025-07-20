import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
    },
    menuItems: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: [1, "Rating must be at least 1"],
          max: [5, "Rating cannot exceed 5"],
        },
        review: {
          type: String,
          trim: true,
          maxlength: [500, "Item review cannot exceed 500 characters"],
        },
      },
    ],
    ratings: {
      food: {
        type: Number,
        required: [true, "Food rating is required"],
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
      delivery: {
        type: Number,
        required: [true, "Delivery rating is required"],
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
      service: {
        type: Number,
        required: [true, "Service rating is required"],
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
      overall: {
        type: Number,
        required: [true, "Overall rating is required"],
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
    },
    review: {
      type: String,
      trim: true,
      maxlength: [1000, "Review cannot exceed 1000 characters"],
    },
    images: [
      {
        public_id: String,
        url: String,
      },
    ],
    tags: [
      {
        type: String,
        enum: [
          "great_food",
          "fast_delivery",
          "excellent_packaging",
          "hot_food",
          "cold_food",
          "late_delivery",
          "wrong_order",
          "missing_items",
          "friendly_delivery",
          "rude_delivery",
          "clean_packaging",
          "damaged_packaging",
          "value_for_money",
          "overpriced",
          "fresh_ingredients",
          "stale_food",
        ],
      },
    ],
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    isHelpful: {
      helpfulCount: {
        type: Number,
        default: 0,
      },
      notHelpfulCount: {
        type: Number,
        default: 0,
      },
    },
    restaurantResponse: {
      message: {
        type: String,
        trim: true,
        maxlength: [500, "Restaurant response cannot exceed 500 characters"],
      },
      respondedAt: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    adminAction: {
      isReported: {
        type: Boolean,
        default: false,
      },
      reportReason: String,
      isHidden: {
        type: Boolean,
        default: false,
      },
      moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      moderatedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
reviewSchema.index({ customer: 1 });
reviewSchema.index({ restaurant: 1 });
reviewSchema.index({ deliveryPartner: 1 });
reviewSchema.index({ order: 1 });
reviewSchema.index({ "ratings.overall": -1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ restaurant: 1, createdAt: -1 });

// Ensure one review per order
reviewSchema.index({ order: 1 }, { unique: true });

// Calculate overall rating as average of food, delivery, and service
reviewSchema.pre("save", function (next) {
  if (
    this.isModified("ratings.food") ||
    this.isModified("ratings.delivery") ||
    this.isModified("ratings.service")
  ) {
    this.ratings.overall =
      Math.round(
        ((this.ratings.food + this.ratings.delivery + this.ratings.service) /
          3) *
          10
      ) / 10;
  }
  next();
});

// Update restaurant and delivery partner ratings after review is saved
reviewSchema.post("save", async function (doc) {
  try {
    // Update restaurant rating
    const Restaurant = mongoose.model("Restaurant");
    const restaurantReviews = await mongoose.model("Review").find({
      restaurant: doc.restaurant,
    });

    if (restaurantReviews.length > 0) {
      const avgRating =
        restaurantReviews.reduce(
          (sum, review) => sum + review.ratings.overall,
          0
        ) / restaurantReviews.length;

      await Restaurant.findByIdAndUpdate(doc.restaurant, {
        $set: {
          "rating.average": Math.round(avgRating * 10) / 10,
          "rating.count": restaurantReviews.length,
        },
      });
    }

    // Update delivery partner rating
    if (doc.deliveryPartner) {
      const DeliveryPartner = mongoose.model("DeliveryPartner");
      const partnerReviews = await mongoose.model("Review").find({
        deliveryPartner: doc.deliveryPartner,
      });

      if (partnerReviews.length > 0) {
        const avgRating =
          partnerReviews.reduce(
            (sum, review) => sum + review.ratings.delivery,
            0
          ) / partnerReviews.length;

        await DeliveryPartner.findByIdAndUpdate(doc.deliveryPartner, {
          $set: {
            "statistics.rating.average": Math.round(avgRating * 10) / 10,
            "statistics.rating.count": partnerReviews.length,
          },
        });
      }
    }

    // Update menu item ratings
    for (let itemReview of doc.menuItems) {
      const MenuItem = mongoose.model("MenuItem");
      const itemReviews = await mongoose
        .model("Review")
        .aggregate([
          { $match: { "menuItems.item": itemReview.item } },
          { $unwind: "$menuItems" },
          { $match: { "menuItems.item": itemReview.item } },
        ]);

      if (itemReviews.length > 0) {
        const avgRating =
          itemReviews.reduce(
            (sum, review) => sum + review.menuItems.rating,
            0
          ) / itemReviews.length;

        await MenuItem.findByIdAndUpdate(itemReview.item, {
          $set: {
            "rating.average": Math.round(avgRating * 10) / 10,
            "rating.count": itemReviews.length,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error updating ratings:", error);
  }
});

export default mongoose.model("Review", reviewSchema);
