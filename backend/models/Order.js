import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    items: [
      {
        menuItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Price cannot be negative"],
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        variant: {
          name: String,
          price: Number,
        },
        addOns: [
          {
            name: {
              type: String,
              required: true,
            },
            price: {
              type: Number,
              required: true,
              min: [0, "Add-on price cannot be negative"],
            },
          },
        ],
        customizations: [
          {
            name: {
              type: String,
              required: true,
            },
            selectedOptions: [
              {
                name: String,
                priceModifier: Number,
              },
            ],
          },
        ],
        specialInstructions: {
          type: String,
          trim: true,
          maxlength: [200, "Special instructions cannot exceed 200 characters"],
        },
        itemTotal: {
          type: Number,
          required: true,
          min: [0, "Item total cannot be negative"],
        },
      },
    ],
    deliveryAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "card", "upi", "wallet", "net_banking"],
      required: true,
    },
    paymentDetails: {
      transactionId: String,
      paymentGateway: String,
      paidAt: Date,
    },
    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: [0, "Subtotal cannot be negative"],
      },
      deliveryFee: {
        type: Number,
        default: 0,
        min: [0, "Delivery fee cannot be negative"],
      },
      taxes: {
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
      },
      discount: {
        amount: { type: Number, default: 0 },
        couponCode: String,
        description: String,
      },
      platformFee: {
        type: Number,
        default: 0,
        min: [0, "Platform fee cannot be negative"],
      },
      packagingFee: {
        type: Number,
        default: 0,
        min: [0, "Packaging fee cannot be negative"],
      },
      total: {
        type: Number,
        required: true,
        min: [0, "Total cannot be negative"],
      },
    },
    estimatedDeliveryTime: {
      type: Date,
      required: true,
    },
    actualDeliveryTime: Date,
    timeline: [
      {
        status: {
          type: String,
          enum: [
            "order_placed",
            "payment_confirmed",
            "order_confirmed",
            "preparing",
            "ready_for_pickup",
            "picked_up",
            "out_for_delivery",
            "delivered",
            "cancelled",
          ],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        description: String,
      },
    ],
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [500, "Special instructions cannot exceed 500 characters"],
    },
    cancellationReason: {
      type: String,
      enum: [
        "customer_request",
        "restaurant_unavailable",
        "item_unavailable",
        "payment_failed",
        "delivery_partner_unavailable",
        "weather_conditions",
        "other",
      ],
    },
    cancellationDetails: {
      reason: String,
      cancelledBy: {
        type: String,
        enum: ["customer", "restaurant", "admin", "system"],
      },
      refundAmount: Number,
      refundStatus: {
        type: String,
        enum: ["pending", "processed", "failed"],
      },
    },
    rating: {
      food: {
        type: Number,
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
      delivery: {
        type: Number,
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
      overall: {
        type: Number,
        min: [1, "Rating must be at least 1"],
        max: [5, "Rating cannot exceed 5"],
      },
      review: String,
      ratedAt: Date,
    },
    otp: {
      code: String,
      expiresAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
orderSchema.index({ customer: 1 });
orderSchema.index({ restaurant: 1 });
orderSchema.index({ deliveryPartner: 1 });
// Note: orderNumber already has unique index, no need to add manually
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });

// Generate order number before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `FR${Date.now()}${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Add timeline entry when status changes
orderSchema.pre("save", function (next) {
  if (this.isModified("orderStatus")) {
    this.timeline.push({
      status:
        this.orderStatus === "pending"
          ? "order_placed"
          : this.orderStatus === "confirmed"
          ? "order_confirmed"
          : this.orderStatus === "preparing"
          ? "preparing"
          : this.orderStatus === "ready_for_pickup"
          ? "ready_for_pickup"
          : this.orderStatus === "out_for_delivery"
          ? "out_for_delivery"
          : this.orderStatus === "delivered"
          ? "delivered"
          : this.orderStatus === "cancelled"
          ? "cancelled"
          : this.orderStatus,
      timestamp: new Date(),
    });
  }
  next();
});

// Calculate estimated delivery time
orderSchema.methods.calculateEstimatedDeliveryTime = function (
  restaurantDeliveryTime
) {
  const now = new Date();
  const estimatedMinutes =
    (restaurantDeliveryTime.min + restaurantDeliveryTime.max) / 2;
  return new Date(now.getTime() + estimatedMinutes * 60000);
};

export default mongoose.model("Order", orderSchema);
