import express from "express";
import {
  getEmailSettings,
  updateEmailSettings,
} from "../../controllers/emailSettingController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/email-settings")
  .get(protect, getEmailSettings)
  .post(protect, updateEmailSettings);

export default router;
