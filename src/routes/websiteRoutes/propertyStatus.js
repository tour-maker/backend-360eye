import express from "express";
import { getAllPropertyStatuses } from "../../controllers/propertyStatusController.js";

const router = express.Router();

// Get all property statuses
router.get("/", getAllPropertyStatuses);

export default router;
