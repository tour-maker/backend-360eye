// src/routes/adminPanelRoutes/redirectURLRoutes.js
import express from "express";
import {
  getAllRedirects,
  createRedirect,
  updateRedirectById,
  deleteRedirectById,
  checkRedirect,
} from "../../controllers/redirectURLController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Public route (no auth required) - must be before protect middleware
router.get("/check", checkRedirect);

// Apply authentication middleware to remaining routes
router.use(protect);

// Protected routes
router.get("/", getAllRedirects);
router.post("/", createRedirect);
router.put("/:id", updateRedirectById);
router.delete("/:id", deleteRedirectById);

export default router;
