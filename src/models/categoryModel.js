import mongoose from "mongoose";

const mainCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    categoryPhoto: {
      type: String, // stores the photo URL/path
      required: false,
    },
    status: {
      type: Boolean,
      default: true,
    },
    orderNo: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // This will automatically handle createdAt and updatedAt
    collection: "mainCategories", // Explicitly set collection name
  }
);

// Create index for faster queries
mainCategorySchema.index({ categoryName: 1 });
mainCategorySchema.index({ orderNo: 1 });

// Add a pre-save middleware to handle the updatedAt field
mainCategorySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const MainCategory = mongoose.model("MainCategory", mainCategorySchema);

export default MainCategory;
