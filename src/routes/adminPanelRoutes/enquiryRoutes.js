import express from "express";
import {
  createEnquiry,
  getAllEnquiries,
  deleteEnquiry,
} from "../../controllers/enquiryController.js";
import protect from "../../middlewares/authMiddleware.js";


const router = express.Router();

// Create a new enquiry
router.post("/", createEnquiry);

// Get all enquiries (protected route)
router.get("/", protect, getAllEnquiries);

// Delete an enquiry (protected route)
router.delete("/:id", protect, deleteEnquiry);

export default router;