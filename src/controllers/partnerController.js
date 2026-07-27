import Partner from "../models/partnerModel.js";
import multer from "multer";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "public/uploads/partners";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${require("path").extname(file.originalname)}`);
  },
});
export const uploadPartnerLogo = multer({ storage }).single("logo");

export const getAllPartners = async (req, res) => {
  try {
    const partners = await Partner.find().sort({ partnerOrder: 1 });
    res.status(200).json({ success: true, partners });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching partners" });
  }
};

export const getPublicPartners = async (req, res) => {
  try {
    const partners = await Partner.find({ isActive: true })
      .select("name logo partnerOrder")
      .sort({ partnerOrder: 1 });
    res.status(200).json({ success: true, partners });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching partners" });
  }
};

export const addPartner = async (req, res) => {
  try {
    const { name, partnerOrder = 0, isActive = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Partner name is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Logo is required" });
    }
    const partner = new Partner({
      name: name.trim(),
      logo: `/uploads/partners/${req.file.filename}`,
      partnerOrder: parseInt(partnerOrder) || 0,
      isActive: isActive === true || isActive === "true",
    });
    await partner.save();
    res.status(201).json({ success: true, message: "Partner created successfully", partner });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating partner" });
  }
};

export const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, partnerOrder, isActive } = req.body;
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }
    if (name !== undefined && name.trim()) partner.name = name.trim();
    if (partnerOrder !== undefined) partner.partnerOrder = parseInt(partnerOrder) || 0;
    if (isActive !== undefined) partner.isActive = isActive === true || isActive === "true";
    if (req.file) partner.logo = `/uploads/partners/${req.file.filename}`;
    await partner.save();
    res.status(200).json({ success: true, message: "Partner updated successfully", partner });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating partner" });
  }
};

export const deletePartner = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }
    res.status(200).json({ success: true, message: "Partner deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting partner" });
  }
};
