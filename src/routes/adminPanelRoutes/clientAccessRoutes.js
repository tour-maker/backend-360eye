import express from "express";
import {
  getAllClientAccess,
  getClientAccessById,
  createClientAccess,
  updateClientAccess,
  deleteClientAccess,
} from "../../controllers/clientAccessController.js";

const router = express.Router();

router.get("/", getAllClientAccess);
router.get("/:id", getClientAccessById);
router.post("/", createClientAccess);
router.put("/:id", updateClientAccess);
router.delete("/:id", deleteClientAccess);

export default router;
