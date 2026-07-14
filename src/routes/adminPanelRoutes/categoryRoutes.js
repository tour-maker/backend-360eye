import express from "express";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteCategoryPhoto,
} from "../../controllers/categoryController.js";

import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAllCategories);
router.post("/", protect, createCategory);
router.put("/:id", protect, updateCategory);
router.delete("/:id", protect, deleteCategory);
router.delete("/photo/:id", protect, deleteCategoryPhoto);

export default router;
