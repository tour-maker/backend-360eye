import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    albumName: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Album" },
    imageStatus: { type: String, default: "Yes" },
    imageOrder: { type: Number, required: true },
    thumbPhoto: { type: String, required: true },
    desktopPhoto: { type: String, required: true },
    tabletPhoto: { type: String, required: true },
    mobilePhoto: { type: String, required: true },
    projectname: { type: String, default: "" },
    architake: { type: String, default: "" },
    aria: { type: String, default: "" },
    imageDescription: { type: String, default: "" },
  },
  { timestamps: true }
);

const Image = mongoose.models.Image || mongoose.model("Image", imageSchema);
export default Image;
