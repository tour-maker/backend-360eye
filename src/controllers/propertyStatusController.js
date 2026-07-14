import PropertyStatus from "../models/propertyStatusSchema.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/propertyStatuses";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "property-status-" + uniqueSuffix + path.extname(file.originalname));
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

// Get all property statuses
const getAllPropertyStatuses = async (req, res) => {
  try {
    const propertyStatuses = await PropertyStatus.find().sort({ orderNo: 1 });
    res.json({ success: true, propertyStatuses });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching property statuses",
      error: error.message,
    });
  }
};

// Get single property status
const getPropertyStatus = async (req, res) => {
  try {
    const propertyStatus = await PropertyStatus.findById(req.params.id);
    if (!propertyStatus) {
      return res.status(404).json({ success: false, message: "Property status not found" });
    }
    res.json({ success: true, propertyStatus });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching property status",
      error: error.message,
    });
  }
};

// Create new property status
const createPropertyStatus = async (req, res) => {
  try {
    upload.single("propertyStatusPhoto")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const { propertyStatusName, status, orderNo } = req.body;

      // Validate required fields
      if (!propertyStatusName || !orderNo) {
        return res.status(400).json({
          success: false,
          message: "Property status name and order number are required",
        });
      }

      // Check if orderNo already exists
      const existingOrder = await PropertyStatus.findOne({ orderNo });
      if (existingOrder) {
        return res.status(400).json({
          success: false,
          message: "Order number already exists",
        });
      }

      const propertyStatus = new PropertyStatus({
        propertyStatusName,
        status: status === "true" || status === true,
        orderNo: Number(orderNo),
        propertyStatusPhoto: req.file
          ? `/uploads/propertyStatuses/${req.file.filename}`
          : "",
      });

      await propertyStatus.save();
      res.status(201).json({
        success: true,
        message: "Property status created successfully",
        propertyStatus,
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating property status",
      error: error.message,
    });
  }
};

// Update property status
const updatePropertyStatus = async (req, res) => {
  try {
    upload.single("propertyStatusPhoto")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const propertyStatus = await PropertyStatus.findById(req.params.id);
      if (!propertyStatus) {
        return res.status(404).json({ success: false, message: "Property status not found" });
      }

      const { propertyStatusName, status, orderNo } = req.body;

      // Check if new orderNo conflicts with existing ones
      if (orderNo && orderNo !== propertyStatus.orderNo) {
        const existingOrder = await PropertyStatus.findOne({
          orderNo,
          _id: { $ne: req.params.id },
        });
        if (existingOrder) {
          return res.status(400).json({
            success: false,
            message: "Order number already exists",
          });
        }
      }

      // Update fields if provided
      if (propertyStatusName)
        propertyStatus.propertyStatusName = propertyStatusName;
      if (status !== undefined)
        propertyStatus.status = status === "true" || status === true;
      if (orderNo) propertyStatus.orderNo = Number(orderNo);

      // Update photo if new one is uploaded
      if (req.file) {
        // Delete old photo if it exists
        if (propertyStatus.propertyStatusPhoto) {
          const oldPath = path.join(
            "public",
            propertyStatus.propertyStatusPhoto
          );
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        propertyStatus.propertyStatusPhoto = `/uploads/propertyStatuses/${req.file.filename}`;
      }

      await propertyStatus.save();
      res.json({
        success: true,
        message: "Property status updated successfully",
        propertyStatus,
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating property status",
      error: error.message,
    });
  }
};

// Delete property status
const deletePropertyStatus = async (req, res) => {
  try {
    const propertyStatus = await PropertyStatus.findById(req.params.id);
    if (!propertyStatus) {
      return res.status(404).json({ success: false, message: "Property status not found" });
    }

    // Delete associated photo if it exists
    if (propertyStatus.propertyStatusPhoto) {
      const photoPath = path.join("public", propertyStatus.propertyStatusPhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await propertyStatus.deleteOne();
    res.json({ success: true, message: "Property status deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting property status",
      error: error.message,
    });
  }
};

export {
  getAllPropertyStatuses,
  getPropertyStatus,
  createPropertyStatus,
  updatePropertyStatus,
  deletePropertyStatus,
};
