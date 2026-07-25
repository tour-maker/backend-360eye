import fs from "fs";
import path from "path";
import { google } from "googleapis";

const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || "";
const SHEET_ID = process.env.CAREERS_GOOGLE_SHEET_ID || "";
const DRIVE_FOLDER_ID = process.env.CAREERS_DRIVE_FOLDER_ID || "";

let authClient = null;

const isConfigured = () => Boolean(KEY_PATH && fs.existsSync(KEY_PATH) && SHEET_ID && DRIVE_FOLDER_ID);

const getAuthClient = async () => {
  if (authClient) return authClient;
  if (!KEY_PATH || !fs.existsSync(KEY_PATH)) {
    throw new Error("Google service account key not configured");
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_PATH,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
  authClient = await auth.getClient();
  return authClient;
};

// Uploads a file buffer to the configured Drive folder, returns { fileId, webViewLink }
export const uploadFileToDrive = async (fileBuffer, fileName, mimeType) => {
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
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: bufferStream,
    },
    fields: "id, webViewLink",
  });

  await drive.permissions.create({
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
    spreadsheetId: SHEET_ID,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [rowValues],
    },
  });
};

export { isConfigured as isGoogleIntegrationConfigured };
