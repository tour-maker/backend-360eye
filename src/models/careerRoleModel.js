import mongoose from "mongoose";

const CareerRoleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
      default: "",
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
    questions: {
      type: [
        {
          label: { type: String, required: true, trim: true },
          fieldType: {
            type: String,
            enum: ["text", "email", "phone", "textarea", "file", "url"],
            default: "text",
          },
          required: { type: Boolean, default: true },
          helpText: { type: String, trim: true, default: "" },
          questionOrder: { type: Number, default: 0 },
        },
      ],
      default: [
        { label: "Full Name", fieldType: "text", required: true, questionOrder: 1 },
        { label: "Email Address", fieldType: "email", required: true, questionOrder: 2 },
        { label: "Phone Number", fieldType: "phone", required: true, questionOrder: 3 },
        { label: "Previous company / experience details", fieldType: "textarea", required: true, questionOrder: 4 },
        { label: "Joining Duration", fieldType: "text", required: true, helpText: "Share your notice period time", questionOrder: 5 },
        { label: "Current Salary (Monthly)", fieldType: "text", required: true, questionOrder: 6 },
        { label: "Expected Salary (Monthly)", fieldType: "text", required: true, questionOrder: 7 },
        { label: "Upload Resume (PDF format)", fieldType: "file", required: true, questionOrder: 8 },
        { label: "Portfolio URL", fieldType: "textarea", required: true, helpText: "You can enter multiple links, if you have. Write 'No' if you don't have.", questionOrder: 9 },
        { label: "Upload Portfolio (PDF format)", fieldType: "file", required: false, questionOrder: 10 },
      ],
    },
  },
  { timestamps: true, collection: "careerRoles" }
);

const CareerRole = mongoose.model("CareerRole", CareerRoleSchema);
export default CareerRole;
