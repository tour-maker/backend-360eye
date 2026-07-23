import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    mainCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainCategory",
      required: false,
    },
    categoryType: {
      type: String,
      enum: ["Virtual Tour", "Playlist"],
      required: true,
    },
    propertyStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyStatus",
      required: true,
    },
    productLocation: {
      type: String,
      default: "",
    },
    propertyType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyType",
      required: true,
    },
    productStatus: {
      type: String,
      enum: ["Yes", "No"],
      required: true,
    },
    area: {
      type: String,
      default: "",
      required: true,
    },
    productSmallDetail: {
      type: String,
      default: "",
    },
    tourName: {
      type: String,
      required: true,
    },
    tourURL: {
      type: String,
      required: true,
    },
    tourOrder: {
      type: Number,
      default: 0,
    },
    urlName: {
      type: String,
      required: true,
    },
    thumbImage: {
      type: String, // Assuming image URL or base64 string
      default: "",
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
    googleAnalyticsId: {
      type: String,
      default: "",
      trim: true,
    },
    bhkType: {
      type: [String],
      enum: ["2 BHK", "3 BHK", "3.5 BHK", "4 BHK", "5 BHK"],
      default: [],
    },
    hasVoiceOver: {
      type: Boolean,
      default: false,
    },
    viewMode: {
      type: String,
      enum: ["Day", "Night", "Both"],
      default: "Day",
    },
  },
  { timestamps: true, collection: "products" }
);

ProductSchema.index({ mainCategory: 1 });
ProductSchema.index({ tourOrder: 1 });
ProductSchema.index({ tourName: 1 });
ProductSchema.index({ urlName: 1 });

const Product = mongoose.model("Product", ProductSchema);

export default Product;
