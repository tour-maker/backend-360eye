import express from "express";
import {
  getAllProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteThumbImage,
  updateProductPassword,
} from "../../controllers/productController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Main product routes
router.get("/",  getAllProducts);
router.get("/category",  protect, getProductsByCategory);
router.post("/",  protect, createProduct);
router.put("/:id", protect,  updateProduct);
router.put("/:id/password", protect, updateProductPassword);
router.delete("/:id", protect,  deleteProduct);

// Image management
router.delete("/thumb-image", protect,  deleteThumbImage);

export default router;
