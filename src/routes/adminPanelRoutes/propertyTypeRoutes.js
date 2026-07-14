import express from "express";
import {
  getAllPropertyTypes,
  getPropertyType,
  createPropertyType,
  updatePropertyType,
  deletePropertyType,
} from "../../controllers/propertyTypeController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Get all property types
router.get("/", getAllPropertyTypes);

// Get single property type
router.get("/:id", protect, getPropertyType);

// Create new property type
router.post("/", protect, createPropertyType);

// Update property type
router.put("/:id", protect, updatePropertyType);

// Delete property type
router.delete("/:id", protect,  deletePropertyType);

export default router;
