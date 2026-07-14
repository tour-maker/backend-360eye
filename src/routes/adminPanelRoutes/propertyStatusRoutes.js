import express from "express";
import {
  getAllPropertyStatuses,
  getPropertyStatus,
  createPropertyStatus,
  updatePropertyStatus,
  deletePropertyStatus,
} from "../../controllers/propertyStatusController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Get all property statuses
router.get("/",  getAllPropertyStatuses);

// Get single property status
router.get("/:id", protect,  getPropertyStatus);

// Create new property status
router.post("/", protect, createPropertyStatus);

// Update property status
router.put("/:id", protect, updatePropertyStatus);

// Delete property status
router.delete("/:id", protect,  deletePropertyStatus);

export default router;
