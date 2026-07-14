import mongoose from "mongoose";

const propertyStatusSchema = new mongoose.Schema(
  {
    propertyStatusName: {
      type: String,
      required: true,
      trim: true,
    },
    propertyStatusPhoto: {
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
    collection: "propertyStatuses",
  }
);

// Create indexes for faster queries
propertyStatusSchema.index({ propertyStatusName: 1 });
propertyStatusSchema.index({ orderNo: 1 });

const PropertyStatus = mongoose.model("PropertyStatus", propertyStatusSchema);

export default PropertyStatus;
