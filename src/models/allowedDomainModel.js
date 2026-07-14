import mongoose from "mongoose";

const AllowedDomainSchema = new mongoose.Schema(
  {
    domainLabel: {
      type: String,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
    },
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    hostname: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    protocol: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    ownerEmails: {
      type: [String],
      default: [],
    },
    expiryDate: {
      type: Date,
    },
    remindBeforeDays: {
      type: Number,
      default: 15,
      min: 1,
      max: 90,
    },
    lastReminderSentAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystemDomain: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "allowedDomains",
  }
);

AllowedDomainSchema.index({ hostname: 1 }, { unique: true });

const AllowedDomain = mongoose.model("AllowedDomain", AllowedDomainSchema);

export default AllowedDomain;
