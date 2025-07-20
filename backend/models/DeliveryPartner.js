import mongoose from "mongoose";

const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    personalInfo: {
      dateOfBirth: {
        type: Date,
        required: [true, "Date of birth is required"],
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: [true, "Gender is required"],
      },
      emergencyContact: {
        name: {
          type: String,
          required: [true, "Emergency contact name is required"],
          trim: true,
        },
        phoneNumber: {
          type: String,
          required: [true, "Emergency contact phone is required"],
        },
        relationship: {
          type: String,
          required: [true, "Relationship is required"],
          trim: true,
        },
      },
    },
    documents: {
      aadharCard: {
        number: {
          type: String,
          required: [true, "Aadhar number is required"],
          validate: {
            validator: function (aadhar) {
              return /^\d{12}$/.test(aadhar);
            },
            message: "Please provide a valid 12-digit Aadhar number",
          },
        },
        document: {
          public_id: String,
          url: String,
        },
      },
      panCard: {
        number: {
          type: String,
          required: [true, "PAN number is required"],
          validate: {
            validator: function (pan) {
              return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
            },
            message: "Please provide a valid PAN number",
          },
        },
        document: {
          public_id: String,
          url: String,
        },
      },
      drivingLicense: {
        number: {
          type: String,
          required: [true, "Driving license number is required"],
        },
        expiryDate: {
          type: Date,
          required: [true, "License expiry date is required"],
        },
        document: {
          public_id: String,
          url: String,
        },
      },
      vehicleRegistration: {
        number: {
          type: String,
          required: [true, "Vehicle registration number is required"],
        },
        document: {
          public_id: String,
          url: String,
        },
      },
      insurance: {
        policyNumber: {
          type: String,
          required: [true, "Insurance policy number is required"],
        },
        expiryDate: {
          type: Date,
          required: [true, "Insurance expiry date is required"],
        },
        document: {
          public_id: String,
          url: String,
        },
      },
    },
    vehicleInfo: {
      type: {
        type: String,
        enum: ["bike", "scooter", "bicycle", "car"],
        required: [true, "Vehicle type is required"],
      },
      brand: {
        type: String,
        required: [true, "Vehicle brand is required"],
        trim: true,
      },
      model: {
        type: String,
        required: [true, "Vehicle model is required"],
        trim: true,
      },
      color: {
        type: String,
        required: [true, "Vehicle color is required"],
        trim: true,
      },
      year: {
        type: Number,
        required: [true, "Manufacturing year is required"],
        min: [2000, "Vehicle year must be 2000 or later"],
        max: [new Date().getFullYear(), "Vehicle year cannot be in the future"],
      },
      fuelType: {
        type: String,
        enum: ["petrol", "diesel", "electric", "cng", "hybrid"],
        required: [true, "Fuel type is required"],
      },
    },
    bankDetails: {
      accountHolderName: {
        type: String,
        required: [true, "Account holder name is required"],
        trim: true,
      },
      accountNumber: {
        type: String,
        required: [true, "Account number is required"],
      },
      ifscCode: {
        type: String,
        required: [true, "IFSC code is required"],
        validate: {
          validator: function (ifsc) {
            return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
          },
          message: "Please provide a valid IFSC code",
        },
      },
      bankName: {
        type: String,
        required: [true, "Bank name is required"],
        trim: true,
      },
      branchName: {
        type: String,
        required: [true, "Branch name is required"],
        trim: true,
      },
    },
    workingAreas: [
      {
        city: {
          type: String,
          required: true,
          trim: true,
        },
        areas: [
          {
            name: {
              type: String,
              required: true,
              trim: true,
            },
            coordinates: {
              latitude: Number,
              longitude: Number,
            },
            radius: {
              type: Number, // in kilometers
              default: 5,
            },
          },
        ],
      },
    ],
    availability: {
      isOnline: {
        type: Boolean,
        default: false,
      },
      currentLocation: {
        latitude: Number,
        longitude: Number,
        lastUpdated: {
          type: Date,
          default: Date.now,
        },
      },
      workingHours: {
        monday: {
          start: String,
          end: String,
          isWorking: { type: Boolean, default: true },
        },
        tuesday: {
          start: String,
          end: String,
          isWorking: { type: Boolean, default: true },
        },
        wednesday: {
          start: String,
          end: String,
          isWorking: { type: Boolean, default: true },
        },
        thursday: {
          start: String,
          end: String,
          isWorking: { type: Boolean, default: true },
        },
        friday: {
          start: String,
          end: String,
          isWorking: { type: Boolean, default: true },
        },
        saturday: {
          start: String,
          end: String,
          isWorking: { type: Boolean, default: true },
        },
        sunday: {
          start: String,
          end: String,
          isWorking: { type: Boolean, default: true },
        },
      },
    },
    statistics: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      completedOrders: {
        type: Number,
        default: 0,
      },
      cancelledOrders: {
        type: Number,
        default: 0,
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
      totalEarnings: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
        min: [0, "Completion rate cannot be negative"],
        max: [100, "Completion rate cannot exceed 100"],
      },
      averageDeliveryTime: {
        type: Number, // in minutes
        default: 0,
      },
    },
    verificationStatus: {
      documentsVerified: {
        type: Boolean,
        default: false,
      },
      backgroundCheckCompleted: {
        type: Boolean,
        default: false,
      },
      trainingCompleted: {
        type: Boolean,
        default: false,
      },
      isApproved: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
deliveryPartnerSchema.index({ user: 1 });
deliveryPartnerSchema.index({ "availability.isOnline": 1 });
deliveryPartnerSchema.index({
  "availability.currentLocation.latitude": 1,
  "availability.currentLocation.longitude": 1,
});
deliveryPartnerSchema.index({ "workingAreas.city": 1 });
deliveryPartnerSchema.index({ "verificationStatus.isApproved": 1 });
deliveryPartnerSchema.index({ "statistics.rating.average": -1 });

// Calculate completion rate
deliveryPartnerSchema.pre("save", function (next) {
  if (this.statistics.totalOrders > 0) {
    this.statistics.completionRate = Math.round(
      (this.statistics.completedOrders / this.statistics.totalOrders) * 100
    );
  }
  next();
});

// Update last active time when coming online
deliveryPartnerSchema.pre("save", function (next) {
  if (this.isModified("availability.isOnline") && this.availability.isOnline) {
    this.lastActiveAt = new Date();
  }
  next();
});

// Check if partner is available for delivery in a specific area
deliveryPartnerSchema.methods.isAvailableInArea = function (
  city,
  latitude,
  longitude
) {
  if (!this.availability.isOnline || !this.verificationStatus.isApproved) {
    return false;
  }

  // Check if working in the city
  const workingArea = this.workingAreas.find((area) => area.city === city);
  if (!workingArea) return false;

  // Check if within radius of any working area
  for (let area of workingArea.areas) {
    if (area.coordinates) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        area.coordinates.latitude,
        area.coordinates.longitude
      );
      if (distance <= area.radius) return true;
    }
  }

  return false;
};

// Calculate distance between two coordinates (Haversine formula)
deliveryPartnerSchema.methods.calculateDistance = function (
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = this.toRadians(lat2 - lat1);
  const dLon = this.toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

deliveryPartnerSchema.methods.toRadians = function (degrees) {
  return degrees * (Math.PI / 180);
};

export default mongoose.model("DeliveryPartner", deliveryPartnerSchema);
