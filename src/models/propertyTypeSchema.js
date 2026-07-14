import mongoose from "mongoose";

const propertyTypeSchema = new mongoose.Schema(
  {
    propertyName: {
      type: String,
      required: true,
      trim: true,
    },
    propertyPhoto: {
      type: String,
      default: "",
    },
    status: {
      type: Boolean,
      default: true,
    },
    orderNo: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "propertyTypes",
  }
);

// Create indexes for faster queries
propertyTypeSchema.index({ propertyName: 1 });
propertyTypeSchema.index({ orderNo: 1 });

const PropertyType = mongoose.model("PropertyType", propertyTypeSchema);

export default PropertyType;
