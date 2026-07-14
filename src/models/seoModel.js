import mongoose from "mongoose";

const SEOSchema = new mongoose.Schema(
  {
    pageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: String,
    },
    thumbnail: {
      type: String, // URL or base64 string
      // required: true,
    },
    keyword: {
      type: String,
      required: true,
    },
    pageTitle: {
      type: String,
      required: true,
    },
    pageDescription: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, collection: "seo" }
);

const SEO = mongoose.model("SEO", SEOSchema);

export default SEO;
