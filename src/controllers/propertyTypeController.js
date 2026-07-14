import PropertyType from "../models/propertyTypeSchema.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/propertyTypes";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "property-type-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Get all property types
const getAllPropertyTypes = async (req, res) => {
  try {
    const propertyTypes = await PropertyType.find().sort({ orderNo: 1 });
 
    res.json({ success: true, propertyTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching property types", error: error.message });
  }
};

// Get single property type
const getPropertyType = async (req, res) => {
  try {
    const propertyType = await PropertyType.findById(req.params.id);
    if (!propertyType) {
      return res.status(404).json({ success: false, message: "Property type not found" });
    }
    res.json({ success: true, propertyType });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching property type", error: error.message });
  }
};

// Create new property type
const createPropertyType = async (req, res) => {
  try {
    upload.single("propertyPhoto")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const { propertyName, status, orderNo } = req.body;

      // Validate required fields
      if (!propertyName || !orderNo) {
        return res.status(400).json({ success: false, message: "Property name and order number are required" });
      }

      // Check if orderNo already exists
      const existingOrder = await PropertyType.findOne({ orderNo });
      if (existingOrder) {
        return res.status(400).json({ success: false, message: "Order number already exists" });
      }

      const propertyType = new PropertyType({
        propertyName,
        status: status === "true" || status === true,
        orderNo: Number(orderNo),
        propertyPhoto: req.file ? `/uploads/propertyTypes/${req.file.filename}` : "",
      });

      await propertyType.save();
      res.status(201).json({ success: true, message: "Property type created successfully", propertyType });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating property type", error: error.message });
  }
};

// Update property type
const updatePropertyType = async (req, res) => {
  try {
    upload.single("propertyPhoto")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const propertyType = await PropertyType.findById(req.params.id);
      if (!propertyType) {
        return res.status(404).json({ success: false, message: "Property type not found" });
      }

      const { propertyName, status, orderNo } = req.body;

      // Check if new orderNo conflicts with existing ones
      if (orderNo && orderNo !== propertyType.orderNo) {
        const existingOrder = await PropertyType.findOne({
          orderNo,
          _id: { $ne: req.params.id },
        });
        if (existingOrder) {
          return res.status(400).json({ success: false, message: "Order number already exists" });
        }
      }

      // Update fields if provided
      if (propertyName) propertyType.propertyName = propertyName;
      if (status !== undefined) propertyType.status = status === "true" || status === true;
      if (orderNo) propertyType.orderNo = Number(orderNo);

      // Update photo if new one is uploaded
      if (req.file) {
        // Delete old photo if it exists
        if (propertyType.propertyPhoto) {
          const oldPath = path.join("public", propertyType.propertyPhoto);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        propertyType.propertyPhoto = `/uploads/propertyTypes/${req.file.filename}`;
      }

      await propertyType.save();
      res.json({ success: true, message: "Property type updated successfully", propertyType });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating property type", error: error.message });
  }
};

// Delete property type
const deletePropertyType = async (req, res) => {
  try {
    const propertyType = await PropertyType.findById(req.params.id);
    if (!propertyType) {
      return res.status(404).json({ success: false, message: "Property type not found" });
    }

    // Delete associated photo if it exists
    if (propertyType.propertyPhoto) {
      const photoPath = path.join("public", propertyType.propertyPhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await propertyType.deleteOne();
    res.json({ success: true, message: "Property type deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting property type", error: error.message });
  }
};

export {
  getAllPropertyTypes,
  getPropertyType,
  createPropertyType,
  updatePropertyType,
  deletePropertyType,
};
