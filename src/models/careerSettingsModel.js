import mongoose from "mongoose";

const CareerSettingsSchema = new mongoose.Schema(
  {
    googleFormBaseUrl: {
      type: String,
      trim: true,
      default: "",
    },
    roleEntryId: {
      type: String,
      trim: true,
      default: "",
    },
    tagline: {
      type: String,
      trim: true,
      default: "We don't just fill roles, we recruit obsessives.",
    },
    subline: {
      type: String,
      trim: true,
      default: "360EYE specializes in immersive virtual tours, 3D visualization, and real estate marketing technology.",
    },
  },
  { timestamps: true, collection: "careerSettings" }
);

const CareerSettings = mongoose.model("CareerSettings", CareerSettingsSchema);
export default CareerSettings;
