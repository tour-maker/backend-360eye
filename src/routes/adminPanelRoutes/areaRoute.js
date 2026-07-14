import express from "express";
import { createArea, fetchAreas, updateArea, deleteArea } from "../../controllers/areaController.js"; // ✅ Fixed import paths
import protect from "../../middlewares/authMiddleware.js"; // ✅ Fixed import path

const router = express.Router();

// ✅ Create a new area (Protected)
router.post("/", protect, createArea);

// ✅ Fetch all areas (Public)
router.get("/", fetchAreas);

// ✅ Update an area by ID (Protected)
router.put("/:id", protect, updateArea);

// ✅ Delete an area by ID (Protected)
router.delete("/:id", protect, deleteArea);

export default router;
