import mongoose from "mongoose";

const FilterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    options: {
      type: [String],
      default: [],
    },
    multiSelect: {
      type: Boolean,
      default: true,
    },
    filterOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, collection: "filters" }
);

const Filter = mongoose.model("Filter", FilterSchema);
export default Filter;
