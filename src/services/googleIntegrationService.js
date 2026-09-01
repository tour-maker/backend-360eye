import fs from "fs";
import path from "path";
import { google } from "googleapis";

const getKeyPath = () => process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || "";
const getSheetId = () => process.env.CAREERS_GOOGLE_SHEET_ID || "";
const getSheetTabName = () => process.env.CAREERS_SHEET_TAB_NAME || "Form Responses 1";
const getResumeFolderId = () => process.env.CAREERS_RESUME_FOLDER_ID || "";
const getPortfolioFolderId = () => process.env.CAREERS_PORTFOLIO_FOLDER_ID || "";

let authClient = null;

const isConfigured = () => Boolean(getKeyPath() && fs.existsSync(getKeyPath()) && getSheetId() && getResumeFolderId() && getPortfolioFolderId());

const getAuthClient = async () => {
  if (authClient) return authClient;
  const keyPath = getKeyPath();
  if (!keyPath || !fs.existsSync(keyPath)) {
    throw new Error("Google service account key not configured");
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
  authClient = await auth.getClient();
  return authClient;
};

// Uploads a file buffer to the configured Drive folder, returns { fileId, webViewLink }
export const uploadFileToDrive = async (fileBuffer, fileName, mimeType, folderType) => {
  const folderId = folderType === "portfolio" ? getPortfolioFolderId() : getResumeFolderId();
  if (!isConfigured()) {
    throw new Error("Google Drive is not configured yet");
  }
  const auth = await getAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const { Readable } = await import("stream");
  const bufferStream = new Readable();
  bufferStream.push(fileBuffer);
  bufferStream.push(null);
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: bufferStream,
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  await drive.permissions.create({
    supportsAllDrives: true,
    fileId: response.data.id,
    requestBody: { role: "reader", type: "anyone" },
  });
  return {
    fileId: response.data.id,
    webViewLink: response.data.webViewLink,
  };
};

// Appends one row to the configured Google Sheet
export const appendRowToSheet = async (rowValues) => {
  if (!isConfigured()) {
    throw new Error("Google Sheets is not configured yet");
  }
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${getSheetTabName()}!C1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [rowValues],
    },
  });
};

export { isConfigured as isGoogleIntegrationConfigured };
