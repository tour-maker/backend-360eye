import crypto from "crypto";

const DEFAULT_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended length for GCM

const getSecretKey = () => {
  const rawKey = process.env.EMAIL_SECRET_KEY || process.env.APP_SECRET_KEY || process.env.JWT_SECRET;
  if (!rawKey) {
    return null;
  }

  return crypto.createHash("sha256").update(String(rawKey)).digest();
};

const secretKey = getSecretKey();
const hasValidKey = Boolean(secretKey);

export const encryptSecret = (plainText) => {
  if (!plainText) {
    return "";
  }

  if (!hasValidKey) {
    return plainText;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(DEFAULT_ALGORITHM, secretKey, iv);

  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

export const decryptSecret = (encryptedValue) => {
  if (!encryptedValue) {
    return "";
  }

  if (!hasValidKey) {
    return encryptedValue;
  }

  const buffer = Buffer.from(encryptedValue, "base64");
  if (buffer.length <= IV_LENGTH + 16) {
    return "";
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buffer.subarray(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(DEFAULT_ALGORITHM, secretKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
};

export const hasEncryptionKey = () => hasValidKey;
