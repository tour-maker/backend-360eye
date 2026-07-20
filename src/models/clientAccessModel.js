import mongoose from "mongoose";

const ClientAccessSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
    },
    assignedTours: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    expiresAt: {
      type: Date,
      default: null, // null = no expiry
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true, collection: "clientAccess" }
);

ClientAccessSchema.index({ slug: 1 });

const ClientAccess = mongoose.model("ClientAccess", ClientAccessSchema);

export default ClientAccess;
