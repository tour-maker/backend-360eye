import express from "express";
import {
  getAllPartners,
  addPartner,
  updatePartner,
  deletePartner,
  uploadPartnerLogo,
} from "../../controllers/partnerController.js";
import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAllPartners);
router.post("/", protect, uploadPartnerLogo, addPartner);
router.put("/:id", protect, uploadPartnerLogo, updatePartner);
router.delete("/:id", protect, deletePartner);

export default router;
