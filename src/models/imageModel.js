import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    albumName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album", // Reference to Album collection
      required: true,
    },
    imageStatus: {
      type: String,
      enum: ["Yes", "No"],
      default: "Yes",
    },
    imageOrder: {
      type: Number,
      default: 0,
    },
    thumbPhoto: {
      type: String,
      default: "",
    },
    desktopPhoto: {
      type: String,
      default: "",
    },
    tabletPhoto: {
      type: String,
      default: "",
    },
    mobilePhoto: {
      type: String,
      default: "",
    },
    imageDescription: {
      type: String,
      default: "",
    },
    projectname: {
      type: String,
      default: "",
    },
    architake: {
      type: String,
      default: "",
    },
    aria: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, collection: "images" }
);

const Image = mongoose.model("Image", ImageSchema);

export default Image;
