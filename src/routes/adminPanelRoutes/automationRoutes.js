import express from "express";
import {
  getAutomationSchema,
  getAutomationProducts,
  setAutomationTag,
} from "../../controllers/automationController.js";
import requireAutomationKey from "../../middlewares/automationAuthMiddleware.js";

const router = express.Router();

router.get("/schema", requireAutomationKey, getAutomationSchema);
router.get("/products", requireAutomationKey, getAutomationProducts);
router.post("/tag", requireAutomationKey, setAutomationTag);

export default router;
