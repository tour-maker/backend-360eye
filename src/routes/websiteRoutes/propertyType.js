import express from "express";
import { getAllPropertyTypes } from "../../controllers/propertyTypeController.js";

const router = express.Router();

router.get("/", getAllPropertyTypes);

export default router;
