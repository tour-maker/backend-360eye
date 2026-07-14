import express from "express";
import createImage from "../../controllers/imageController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/images",  protect, createImage);

export default router;
