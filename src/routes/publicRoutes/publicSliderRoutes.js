import express from "express";
import { getPublicSliders } from "../../controllers/publicSliderController.js";
const router = express.Router();
router.options("/", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.sendStatus(204);
});
router.get("/", getPublicSliders);
export default router;
