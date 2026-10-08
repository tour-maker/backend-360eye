import express from "express";
import { getLegacyFilterConfigs, upsertLegacyFilterConfig } from "../../controllers/legacyFilterConfigController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getLegacyFilterConfigs);
router.put("/:key", protect, upsertLegacyFilterConfig);

export default router;
