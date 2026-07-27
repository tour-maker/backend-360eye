import express from "express";
import { getPublicSliders } from "../../controllers/publicSliderController.js";
const router = express.Router();
router.get("/", getPublicSliders);
export default router;
