import mongoose from "mongoose";

const CareerApplicationSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareerRole",
      required: true,
    },
    roleTitle: {
      type: String,
      required: true,
      trim: true,
    },
    answers: {
      type: [
        {
          label: { type: String, required: true },
          fieldType: { type: String, default: "text" },
          value: { type: String, default: "" },
          fileUrl: { type: String, default: "" },
        },
      ],
      default: [],
    },
    applicantName: {
      type: String,
      trim: true,
      default: "",
    },
    applicantEmail: {
      type: String,
      trim: true,
      default: "",
    },
    syncedToSheet: {
      type: Boolean,
      default: false,
    },
    syncError: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, collection: "careerApplications" }
);

const CareerApplication = mongoose.model("CareerApplication", CareerApplicationSchema);
export default CareerApplication;
