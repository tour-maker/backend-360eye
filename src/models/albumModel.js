import mongoose from "mongoose";

const AlbumSchema = new mongoose.Schema(
  {
    albumName: {
      type: String,
      required: true,
    },
    albumDesc: {
      type: String,
      required: true,
    },
    albumPhoto: {
      type: String, // Storing image URL or base64 string
      default: "",
    },
    status: {
      type: String,
      // enum: ["Yes", "No"],
      default: "Yes",
    },
    orderNo: {
      type: Number,
      default: 0,
    },
    albumType: {
      type: String,
      enum: ["Gallery", "Link", "Page"], // Define possible types of albums
      required: true, // Ensures albumType must be provided
    },
    albumExtraField: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, collection: "album" }
);

const Album = mongoose.model("Album", AlbumSchema);

export default Album;
