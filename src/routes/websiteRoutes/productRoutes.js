import express from "express";
import { getAllProducts, verifyProductPassword } from "../../controllers/productController.js";

const router = express.Router();

// Main product routes
router.get("/", getAllProducts);
router.post("/:id/verify-password", verifyProductPassword);

export default router;
