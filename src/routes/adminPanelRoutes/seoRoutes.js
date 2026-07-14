import express from "express";
import {
  getAllSEOs,
  createSEO,
  deleteSEO,
  updateSEO,
  getSEOById,
} from "../../controllers/seoController.js";
const router = express.Router();

import protect from "../../middlewares/authMiddleware.js"


router.get("/", protect, getAllSEOs);
router.post("/", protect, createSEO);
router.get("/:id",protect, getSEOById);
router.put("/:id", protect, updateSEO);
router.delete("/:id", protect, deleteSEO);

export default router;
