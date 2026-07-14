import express from "express";
import {
  getAllProducts360,
  createProduct360,
  updateProduct360,
  deleteProduct360,
  deleteThumbImage360,
} from "../../controllers/product360Controller.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect,  getAllProducts360);
router.post("/",  protect, createProduct360);
router.put("/:id", protect,  updateProduct360);
router.delete("/:id",  protect, deleteProduct360);
router.delete("/thumb/:id", protect,  deleteThumbImage360);

export default router;
