import Product360 from "../models/product360Model.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/360products";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "360products-" + uniqueSuffix + path.extname(file.originalname));
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

// Get all 360 products with pagination
const getAllProducts360 = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};

    // Add search functionality
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const products = await Product360.find(query)
      .sort({ tourOrder: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Product360.countDocuments(query);

    if (products.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No 360° products found" });
    }

    res.json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalProducts: total,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Create a new 360 product with image upload
const createProduct360 = async (req, res) => {
  try {
    upload.single("thumbImage")(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err.message); // Log multer errors
        return res.status(400).json({ success: false, message: err.message });
      }

      const {
        name,
        virtualTourLink,
        productStatus = "Yes",
        tourOrder = 0,
      } = req.body;

      // Validation
      if (!name || !virtualTourLink) {
        console.error("Missing fields:", { name, virtualTourLink }); // Log missing fields
        return res.status(400).json({
          success: false,
          message: "Required fields are missing",
          required: ["name", "virtualTourLink"],
        });
      }

      // Validate productStatus enum
      if (productStatus && !["Yes", "No"].includes(productStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product status. Must be 'Yes' or 'No'",
        });
      }

      const newProduct360 = new Product360({
        name,
        virtualTourLink,
        productStatus,
        tourOrder: parseInt(tourOrder),
        thumbImage: req.file ? `/uploads/360products/${req.file.filename}` : "",
      });

      await newProduct360.save();
      res.status(201).json({
        success: true,
        message: "360° product created successfully",
        product: newProduct360,
      });
    });
  } catch (error) {
    console.error("Server error in createProduct360:", error); // Log server errors
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Update 360 product
const updateProduct360 = async (req, res) => {
  try {
    upload.single("thumbImage")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const { id } = req.params;
      const updateData = req.body;

      // Find the existing product
      const product = await Product360.findById(id);

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "360° product not found" });
      }

      // Validate productStatus if it's being updated
      if (
        updateData.productStatus &&
        !["Yes", "No"].includes(updateData.productStatus)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product status. Must be 'Yes' or 'No'",
        });
      }

      // Update all provided fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          if (key === "tourOrder") {
            product[key] = parseInt(updateData[key]);
          } else {
            product[key] = updateData[key];
          }
        }
      });

      // Update image if new one is uploaded
      if (req.file) {
        product.thumbImage = `/uploads/360products/${req.file.filename}`;
      }

      await product.save();
      res.json({
        success: true,
        message: "360° product updated successfully",
        product,
      });
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete 360 product
const deleteProduct360 = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product360.findByIdAndDelete(id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "360° product not found" });
    }

    res.json({
      success: true,
      message: "360° product deleted successfully",
      product,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Helper function to delete thumb image
const deleteThumbImage360 = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product360.findById(id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "360° product not found" });
    }

    product.thumbImage = "";
    await product.save();

    res.json({
      success: true,
      message: "Thumb image deleted successfully",
      product,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export {
  getAllProducts360,
  createProduct360,
  updateProduct360,
  deleteProduct360,
  deleteThumbImage360,
};
