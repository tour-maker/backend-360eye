import express from "express";
import {
  getAllRoles,
  addRole,
  updateRole,
  deleteRole,
  getSettings,
  updateSettings,
  submitApplication,
  getAllApplications,
  deleteApplication,
  uploadApplicationFiles,
} from "../../controllers/careerController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/roles", getAllRoles);
router.post("/roles", protect, addRole);
router.put("/roles/:id", protect, updateRole);
router.delete("/roles/:id", protect, deleteRole);

router.get("/settings", getSettings);
router.put("/settings", protect, updateSettings);

router.post("/apply", uploadApplicationFiles, submitApplication);
router.get("/applications", protect, getAllApplications);
router.delete("/applications/:id", protect, deleteApplication);

export default router;
