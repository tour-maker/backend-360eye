// src/routes/adminPanelRoutes/uploadRoutes.js

import express from "express";
import multer from "multer";
import { handleZipUpload } from "../../controllers/uploadController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// router.post("/upload-zip", upload.single("zipFile"), handleZipUpload);

export default router;
