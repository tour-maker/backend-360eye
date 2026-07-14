import Image from "../models/imageModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/images";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "image-" + uniqueSuffix + path.extname(file.originalname));
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
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
});

// Create a new image entry with file uploads
const createImage = async (req, res) => {
  try {
    // Use Multer middleware to handle file uploads
    upload.fields([
      { name: "thumbPhoto", maxCount: 1 },
      { name: "desktopPhoto", maxCount: 1 },
      { name: "tabletPhoto", maxCount: 1 },
      { name: "mobilePhoto", maxCount: 1 },
    ])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      // Extract fields from the request body
      const {
        albumName,
        imageStatus,
        imageOrder,
        imageDescription,
      } = req.body;

      // Extract file paths from the uploaded files
      const thumbPhoto = req.files?.thumbPhoto?.[0];
      const desktopPhoto = req.files?.desktopPhoto?.[0];
      const tabletPhoto = req.files?.tabletPhoto?.[0];
      const mobilePhoto = req.files?.mobilePhoto?.[0];

      // Validation
      if (
        !albumName ||
        !imageStatus ||
        !imageOrder ||
        !imageDescription ||
        !thumbPhoto
      ) {
        return res.status(400).json({
          success: false,
          message: "Required fields are missing",
        });
      }

      // Create a new image entry
      const newImage = new Image({
        albumName,
        imageStatus,
        imageOrder,
        imageDescription,
        thumbPhoto: thumbPhoto ? `/uploads/images/${thumbPhoto.filename}` : null,
        desktopPhoto: desktopPhoto ? `/uploads/images/${desktopPhoto.filename}` : null,
        tabletPhoto: tabletPhoto ? `/uploads/images/${tabletPhoto.filename}` : null,
        mobilePhoto: mobilePhoto ? `/uploads/images/${mobilePhoto.filename}` : null,
      });

      // Save the image to the database
      await newImage.save();

      // Send success response
      res.status(201).json({
        success: true,
        message: "Image added successfully",
        image: newImage,
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export default createImage;