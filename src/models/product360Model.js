import mongoose from "mongoose";

const Product360Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    virtualTourLink: {
      type: String,
      required: true,
    },
    thumbImage: {
      type: String, // URL or base64 string
      // required: true,
    },
    productStatus: {
      type: String,
      enum: ["Yes", "No"],
      default: "Yes",
    },
    tourOrder: {
      type: Number,
      default: 0,
    },
    tourPasswordEnabled: {
      type: Boolean,
      default: false,
    },
    tourPasswordHash: {
      type: String,
      default: null,
      select: false,
    },
    tourPasswordUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "product360" }
);

const Product360 = mongoose.model("Product360", Product360Schema);

export default Product360;
