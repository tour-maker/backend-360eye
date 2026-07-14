import express from "express";
import {
  getAllSliders,
  addSlider,
  getSlider,
  updateSlider,
  deleteSlider,
  updateSliderOrder,
} from "../../controllers/sliderController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getAllSliders);
router.post("/", protect, addSlider);
router.get("/:id", protect, getSlider);
router.put("/:id",protect, updateSlider);
router.patch("/:id/order", protect, updateSliderOrder);
router.delete("/:id", protect, deleteSlider);

export default router;
