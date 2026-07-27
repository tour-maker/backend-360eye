import express from "express";
import { getPublicPartners } from "../../controllers/partnerController.js";
const router = express.Router();
router.get("/", getPublicPartners);
export default router;
