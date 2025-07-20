import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      maxlength: [100, "Menu item name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountedPrice: {
      type: Number,
      min: [0, "Discounted price cannot be negative"],
      validate: {
        validator: function (value) {
          return !value || value < this.price;
        },
        message: "Discounted price must be less than original price",
      },
    },
    images: [
      {
        public_id: String,
        url: String,
      },
    ],
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    allergens: [
      {
        type: String,
        enum: [
          "Gluten",
          "Dairy",
          "Eggs",
          "Fish",
          "Shellfish",
          "Tree Nuts",
          "Peanuts",
          "Soy",
          "Sesame",
          "Mustard",
          "Sulphites",
        ],
      },
    ],
    nutritionInfo: {
      calories: Number,
      protein: Number, // in grams
      carbohydrates: Number, // in grams
      fat: Number, // in grams
      fiber: Number, // in grams
      sugar: Number, // in grams
    },
    dietary: [
      {
        type: String,
        enum: [
          "vegetarian",
          "vegan",
          "gluten-free",
          "dairy-free",
          "keto",
          "low-carb",
          "high-protein",
        ],
      },
    ],
    spiceLevel: {
      type: String,
      enum: ["mild", "medium", "hot", "extra-hot"],
      default: "mild",
    },
    preparationTime: {
      type: Number, // in minutes
      default: 15,
      min: [5, "Preparation time must be at least 5 minutes"],
      max: [120, "Preparation time cannot exceed 120 minutes"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isRecommended: {
      type: Boolean,
      default: false,
    },
    isBestseller: {
      type: Boolean,
      default: false,
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
    variants: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Variant price cannot be negative"],
        },
        discountedPrice: {
          type: Number,
          min: [0, "Discounted price cannot be negative"],
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
      },
    ],
    addOns: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Add-on price cannot be negative"],
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
      },
    ],
    customizations: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        options: [
          {
            name: {
              type: String,
              required: true,
              trim: true,
            },
            priceModifier: {
              type: Number,
              default: 0, // positive for extra cost, negative for discount
            },
          },
        ],
        isRequired: {
          type: Boolean,
          default: false,
        },
        minSelections: {
          type: Number,
          default: 0,
        },
        maxSelections: {
          type: Number,
          default: 1,
        },
      },
    ],
    totalOrders: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
menuItemSchema.index({ restaurant: 1 });
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ restaurant: 1, category: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ "rating.average": -1 });
menuItemSchema.index({ totalOrders: -1 });
menuItemSchema.index({ dietary: 1 });

// Calculate final price considering discount
menuItemSchema.virtual("finalPrice").get(function () {
  return this.discountedPrice || this.price;
});

// Calculate discount percentage
menuItemSchema.virtual("discountPercentage").get(function () {
  if (!this.discountedPrice) return 0;
  return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
});

export default mongoose.model("MenuItem", menuItemSchema);
