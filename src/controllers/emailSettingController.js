import EmailSetting from "../models/emailSettingSchema.js";
import { encryptSecret, decryptSecret } from "../utils/secretEncryption.js";
import { resetEmailSettingsCache } from "../services/emailService.js";

const sanitizeSettings = (settings) => {
  if (!settings) {
    return null;
  }

  const plain = typeof settings.toObject === "function" ? settings.toObject() : settings;

  return {
    senderEmail: plain.senderEmail || "",
    senderDisplayName: plain.senderDisplayName || "",
    host: plain.host || "",
    port: plain.port || 0,
    enableSSL: Boolean(plain.enableSSL),
    toEmail: plain.toEmail || "",
    hasPassword: Boolean(plain.senderPassword),
    updatedAt: plain.updatedAt || null,
  };
};

export const getEmailSettings = async (_req, res) => {
  try {
    const settings = await EmailSetting.findOne({});
    return res.status(200).json({ success: true, settings: sanitizeSettings(settings) });
  } catch (error) {
    console.error("Failed to load email settings", error);
    return res.status(500).json({ success: false, message: "Failed to load email settings" });
  }
};

export const updateEmailSettings = async (req, res) => {
  try {
    const {
      senderEmail,
      senderPassword,
      senderDisplayName,
      host,
      port,
      enableSSL,
      toEmail,
    } = req.body;

    if (!senderEmail || !senderDisplayName || !host || !port || !toEmail) {
      return res.status(400).json({
        success: false,
        message: "Sender email, display name, host, port, and recipient email are required",
      });
    }

    const numericPort = Number(port);
    if (Number.isNaN(numericPort) || numericPort <= 0) {
      return res.status(400).json({
        success: false,
        message: "Port must be a valid positive number",
      });
    }

    const existingSettings = await EmailSetting.findOne({});

    if (!existingSettings && !senderPassword) {
      return res.status(400).json({
        success: false,
        message: "Sender password is required for initial configuration",
      });
    }

    const updatePayload = {
      senderEmail: String(senderEmail).trim(),
      senderDisplayName: String(senderDisplayName).trim(),
      host: String(host).trim(),
      port: numericPort,
      enableSSL: enableSSL === true || enableSSL === "true" || enableSSL === 1 || enableSSL === "1",
      toEmail: String(toEmail).trim(),
    };

    if (senderPassword) {
      updatePayload.senderPassword = encryptSecret(String(senderPassword));
    } else if (existingSettings) {
      updatePayload.senderPassword = existingSettings.senderPassword;
    }

    const settings = await EmailSetting.findOneAndUpdate({}, updatePayload, {
      new: true,
      upsert: true,
    });

    resetEmailSettingsCache();

    return res.status(200).json({
      success: true,
      message: "Email settings updated successfully",
      settings: sanitizeSettings(settings),
    });
  } catch (error) {
    console.error("Failed to update email settings", error);
    return res.status(500).json({ success: false, message: "Failed to update email settings" });
  }
};

export const getDecryptedEmailSettings = async () => {
  const settings = await EmailSetting.findOne({});
  if (!settings) {
    return null;
  }

  return {
    senderEmail: settings.senderEmail,
    senderPassword: decryptSecret(settings.senderPassword),
    senderDisplayName: settings.senderDisplayName,
    host: settings.host,
    port: settings.port,
    enableSSL: Boolean(settings.enableSSL),
    toEmail: settings.toEmail,
  };
};
