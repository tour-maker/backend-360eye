import express from "express";
import {
  getAllFilters,
  getFilter,
  addFilter,
  updateFilter,
  deleteFilter,
} from "../../controllers/filterController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getAllFilters);
router.get("/:id", protect, getFilter);
router.post("/", protect, addFilter);
router.put("/:id", protect, updateFilter);
router.delete("/:id", protect, deleteFilter);

export default router;
