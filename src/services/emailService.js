import nodemailer from "nodemailer";
import EmailSetting from "../models/emailSettingSchema.js";
import { decryptSecret } from "../utils/secretEncryption.js";

const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedSettings = null;
let cacheExpiresAt = 0;
let cachedTransporterKey = null;
let cachedTransporter = null;

const buildFromAddress = (settings) => {
  if (settings.senderDisplayName) {
    return `${settings.senderDisplayName} <${settings.senderEmail}>`;
  }
  return settings.senderEmail;
};

const deriveTransporterKey = (settings) =>
  [
    settings.senderEmail,
    settings.host,
    settings.port,
    settings.enableSSL,
    settings.senderPassword,
  ].join(":");

const loadEmailSettings = async () => {
  const now = Date.now();
  if (cachedSettings && cacheExpiresAt > now) {
    return cachedSettings;
  }

  const record = await EmailSetting.findOne({}).lean();
  if (!record) {
    cachedSettings = null;
    cacheExpiresAt = now + SETTINGS_CACHE_TTL_MS;
    cachedTransporter = null;
    cachedTransporterKey = null;
    return null;
  }

  const decryptedPassword = decryptSecret(record.senderPassword);

  cachedSettings = {
    senderEmail: record.senderEmail,
    senderPassword: decryptedPassword,
    senderDisplayName: record.senderDisplayName || "",
    host: record.host,
    port: record.port,
    enableSSL: Boolean(record.enableSSL),
    toEmail: record.toEmail || "",
    updatedAt: record.updatedAt || null,
  };
  cacheExpiresAt = now + SETTINGS_CACHE_TTL_MS;

  return cachedSettings;
};

const ensureTransporter = async () => {
  const settings = await loadEmailSettings();
  if (!settings) {
    throw new Error("Email settings have not been configured");
  }

  if (!settings.senderEmail || !settings.senderPassword || !settings.host || !settings.port) {
    throw new Error("Email settings are incomplete");
  }

  const transporterKey = deriveTransporterKey(settings);

  if (cachedTransporter && cachedTransporterKey === transporterKey) {
    return { transporter: cachedTransporter, settings };
  }

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.enableSSL,
    auth: {
      user: settings.senderEmail,
      pass: settings.senderPassword,
    },
  });

  cachedTransporter = transporter;
  cachedTransporterKey = transporterKey;

  return { transporter, settings };
};

export const resetEmailSettingsCache = () => {
  cachedSettings = null;
  cacheExpiresAt = 0;
  cachedTransporter = null;
  cachedTransporterKey = null;
};

export const getCachedEmailSettings = async () => loadEmailSettings();

const normalizeAddressInput = (value) => {
  if (!value) return [];

  const collection = new Set();

  const collect = (entry) => {
    if (Array.isArray(entry)) {
      entry.forEach(collect);
      return;
    }

    const stringValue = String(entry).trim();
    if (!stringValue) return;

    stringValue
      .split(/[,;]+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .forEach((segment) => collection.add(segment));
  };

  collect(value);

  return Array.from(collection);
};

export const sendEmail = async ({
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  replyTo,
}) => {
  const { transporter, settings } = await ensureTransporter();

  const toList = normalizeAddressInput(to || settings.toEmail);

  if (!toList.length) {
    throw new Error("No recipients specified for email");
  }

  const ccList = normalizeAddressInput(cc);
  const bccList = normalizeAddressInput(bcc);

  const mailOptions = {
    from: buildFromAddress(settings),
    to: toList.join(", "),
    subject: subject || "",
    text: text || undefined,
    html: html || undefined,
  };

  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  if (ccList.length) {
    mailOptions.cc = ccList.join(", ");
  }
  if (bccList.length) {
    mailOptions.bcc = bccList.join(", ");
  }

  return transporter.sendMail(mailOptions);
};

export const verifyEmailTransporter = async () => {
  const { transporter } = await ensureTransporter();
  await transporter.verify();
  return true;
};
