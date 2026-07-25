import mongoose from "mongoose";

const CareerRoleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    roleOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, collection: "careerRoles" }
);

const CareerRole = mongoose.model("CareerRole", CareerRoleSchema);
export default CareerRole;
