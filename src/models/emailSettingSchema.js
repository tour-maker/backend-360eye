import mongoose from "mongoose";

const EmailSettingSchema = new mongoose.Schema(
  {
    senderEmail: {
      type: String,
      required: true,
      trim: true,
    },
    senderPassword: {
      type: String,
      required: true,
    },
    senderDisplayName: {
      type: String,
      required: true,
      trim: true,
    },
    host: {
      type: String,
      required: true,
      trim: true,
    },
    port: {
      type: Number,
      required: true,
    },
    enableSSL: {
      type: Boolean,
      required: true,
    },
    toEmail: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true, collection: "emailSettings" }
);

const EmailSetting = mongoose.model("EmailSetting", EmailSettingSchema);
export { EmailSetting };
export default EmailSetting;
