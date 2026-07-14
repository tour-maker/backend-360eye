import express from "express";
import { signup, login, updatePassword} from "../../controllers/adminController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
// Protected Routes (require authentication)
router.post("/updatePassword", protect, updatePassword); // Add this route

export default router;
