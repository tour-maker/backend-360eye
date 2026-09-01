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
            enum: ["text", "email", "phone", "textarea", "file", "url", "select"],
            default: "text",
          },
          options: { type: [String], default: [] },
          required: { type: Boolean, default: true },
          helpText: { type: String, trim: true, default: "" },
          questionOrder: { type: Number, default: 0 },
        },
      ],
      default: [
        { label: "Which profile you are applying for?", fieldType: "select", required: true, questionOrder: 1, options: ["3D Architectural Visualizer","3D Design Manager","Project Manager","Business Development Representative (Sales)","Photo Editor","Video Editor","Web Developer","Graphic/UI Designer"] },
        { label: "How did you hear about this opening?", fieldType: "select", required: true, questionOrder: 2, options: ["LinkedIn","Indeed","Naukri","Workindia","Recruitment Agency","Social Media","Referral","Other"] },
        { label: "Full Name", fieldType: "text", required: true, questionOrder: 3 },
        { label: "Contact Number", fieldType: "phone", required: true, questionOrder: 4 },
        { label: "Email Address", fieldType: "email", required: true, questionOrder: 5 },
        { label: "Total Work Experience (in years)", fieldType: "text", required: true, questionOrder: 6 },
        { label: "Joining Duration", fieldType: "text", required: true, helpText: "Share your notice period time", questionOrder: 7 },
        { label: "Current Salary (Monthly)", fieldType: "text", required: true, questionOrder: 8 },
        { label: "Expected Salary (Monthly)", fieldType: "text", required: true, questionOrder: 9 },
        { label: "Upload Resume (PDF format)", fieldType: "file", required: true, questionOrder: 10 },
        { label: "Portfolio URL", fieldType: "textarea", required: true, helpText: "You can enter multiple links, if you have. Write 'No' if you don't have.", questionOrder: 11 },
        { label: "Upload Portfolio (PDF format)", fieldType: "file", required: false, questionOrder: 12 },
      ],
    },
  },
  { timestamps: true, collection: "careerRoles" }
);

const CareerRole = mongoose.model("CareerRole", CareerRoleSchema);
export default CareerRole;
