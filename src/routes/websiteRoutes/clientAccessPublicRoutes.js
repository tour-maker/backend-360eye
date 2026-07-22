import express from "express";
import { getClientAccessBySlug } from "../../controllers/clientAccessController.js";

const router = express.Router();

router.get("/:slug", getClientAccessBySlug);

export default router;
