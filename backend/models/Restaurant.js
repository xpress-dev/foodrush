import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
      maxlength: [100, "Restaurant name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    cuisine: [
      {
        type: String,
        required: true,
        trim: true,
        enum: [
          "Indian",
          "Chinese",
          "Italian",
          "Mexican",
          "Thai",
          "Japanese",
          "American",
          "Mediterranean",
          "French",
          "Korean",
          "Vietnamese",
          "Fast Food",
          "Desserts",
          "Beverages",
          "Healthy",
          "Vegan",
          "Continental",
        ],
      },
    ],
    email: {
      type: String,
      required: [true, "Restaurant email is required"],
      lowercase: true,
      validate: {
        validator: function (email) {
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
        },
        message: "Please provide a valid email address",
      },
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function (phone) {
          return /^\+?[\d\s-()]{10,}$/.test(phone);
        },
        message: "Please provide a valid phone number",
      },
    },
    address: {
      addressLine1: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
      },
      addressLine2: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
      postalCode: {
        type: String,
        required: [true, "Postal code is required"],
        trim: true,
      },
      coordinates: {
        latitude: {
          type: Number,
          required: true,
          min: [-90, "Latitude must be between -90 and 90"],
          max: [90, "Latitude must be between -90 and 90"],
        },
        longitude: {
          type: Number,
          required: true,
          min: [-180, "Longitude must be between -180 and 180"],
          max: [180, "Longitude must be between -180 and 180"],
        },
      },
    },
    images: [
      {
        public_id: String,
        url: String,
      },
    ],
    logo: {
      public_id: String,
      url: String,
    },
    coverImage: {
      public_id: String,
      url: String,
    },
    openingHours: {
      monday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      tuesday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      wednesday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      thursday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      friday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      saturday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      sunday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: [0, "Rating cannot be negative"],
        max: [5, "Rating cannot exceed 5"],
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    deliveryRadius: {
      type: Number, // in kilometers
      default: 10,
      min: [1, "Delivery radius must be at least 1 km"],
      max: [50, "Delivery radius cannot exceed 50 km"],
    },
    minimumOrder: {
      type: Number,
      default: 0,
      min: [0, "Minimum order cannot be negative"],
    },
    deliveryFee: {
      type: Number,
      default: 30,
      min: [0, "Delivery fee cannot be negative"],
    },
    deliveryTime: {
      min: {
        type: Number,
        default: 30,
        min: [10, "Minimum delivery time must be at least 10 minutes"],
      },
      max: {
        type: Number,
        default: 60,
        min: [15, "Maximum delivery time must be at least 15 minutes"],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isCurrentlyOpen: {
      type: Boolean,
      default: false,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    businessLicense: {
      number: String,
      document: {
        public_id: String,
        url: String,
      },
    },
    gstNumber: {
      type: String,
      validate: {
        validator: function (gst) {
          return (
            !gst ||
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
              gst
            )
          );
        },
        message: "Please provide a valid GST number",
      },
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
restaurantSchema.index({ owner: 1 });
restaurantSchema.index({
  "address.coordinates.latitude": 1,
  "address.coordinates.longitude": 1,
});
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ isActive: 1, isVerified: 1 });
restaurantSchema.index({ "rating.average": -1 });

// Check if restaurant is currently open
restaurantSchema.methods.isOpenNow = function () {
  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "lowercase" });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const daySchedule = this.openingHours[currentDay];

  if (daySchedule.isClosed) return false;

  return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
};

export default mongoose.model("Restaurant", restaurantSchema);
