import mongoose from "mongoose";

const areaSchema = new mongoose.Schema(
  {
    area: {
      type: String,
      required: true,
      unique: true, // Ensure area names are unique
    },
  },
  { timestamps: true }
);

const Area = mongoose.model("Area", areaSchema);

export default Area;