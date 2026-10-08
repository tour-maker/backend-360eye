import mongoose from "mongoose";

const LegacyFilterConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, enum: ["propertyType", "propertyStatus", "area"] },
    label: { type: String, trim: true },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "legacyFilterConfigs" }
);

const LegacyFilterConfig = mongoose.model("LegacyFilterConfig", LegacyFilterConfigSchema);
export default LegacyFilterConfig;
