import express from "express";
import protect from "../../middlewares/authMiddleware.js";
import {
  listAllowedDomains,
  getAllowedDomain,
  createAllowedDomain,
  updateAllowedDomain,
  updateAllowedDomainStatus,
  deleteAllowedDomain,
  refreshSecurityConfig,
  getSecurityConfigPreview,
} from "../../controllers/allowedDomainController.js";

const router = express.Router();

router.get("/", protect, listAllowedDomains);
router.get("/preview", protect, getSecurityConfigPreview);
router.post("/refresh", protect, refreshSecurityConfig);
router.get("/:id", protect, getAllowedDomain);
router.post("/", protect, createAllowedDomain);
router.put("/:id", protect, updateAllowedDomain);
router.patch("/:id/status", protect, updateAllowedDomainStatus);
router.delete("/:id", protect, deleteAllowedDomain);

export default router;
