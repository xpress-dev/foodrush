import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
    label: {
      type: String,
      trim: true,
      maxlength: [50, "Address label cannot exceed 50 characters"],
    },
    addressLine1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
      maxlength: [200, "Address line 1 cannot exceed 200 characters"],
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [200, "Address line 2 cannot exceed 200 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [100, "City name cannot exceed 100 characters"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: [100, "State name cannot exceed 100 characters"],
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
      trim: true,
      validate: {
        validator: function (code) {
          return /^[0-9]{5,6}$/.test(code);
        },
        message: "Please provide a valid postal code",
      },
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      default: "India",
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"],
      },
      longitude: {
        type: Number,
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"],
      },
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: [200, "Landmark cannot exceed 200 characters"],
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [500, "Delivery instructions cannot exceed 500 characters"],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
addressSchema.index({ user: 1 });
addressSchema.index({ "coordinates.latitude": 1, "coordinates.longitude": 1 });

// Ensure only one default address per user
addressSchema.pre("save", async function (next) {
  if (this.isDefault && this.isModified("isDefault")) {
    await mongoose
      .model("Address")
      .updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { isDefault: false }
      );
  }
  next();
});

export default mongoose.model("Address", addressSchema);
