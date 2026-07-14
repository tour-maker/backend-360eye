import Category from "../models/categoryModel.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/categories/"),
  filename: (req, file, cb) => {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${Date.now()}-${sanitizedFilename}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Invalid file type"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (search) query.categoryName = { $regex: search, $options: "i" };
    if (status) query.status = status;

    const categories = await Category.find(query).sort({ orderNo: 1, categoryName: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    upload.single("categoryPhoto")(req, res, async (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });

      const { categoryName, status, orderNo = 0 } = req.body;
      const existingCategory = await Category.findOne({ categoryName: new RegExp(`^${categoryName}$`, "i") });

      if (existingCategory) {
        if (req.file) await fs.unlink(req.file.path);
        return res.status(400).json({ success: false, message: "Category name already exists" });
      }

      const newCategory = new Category({
        categoryName: categoryName.trim(),
        status: status === "true",
        orderNo: parseInt(orderNo),
        categoryPhoto: req.file ? `/uploads/categories/${req.file.filename}` : "",
      });

      await newCategory.save();
      res.status(201).json({ success: true, message: "Category created successfully", category: newCategory });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    upload.single("categoryPhoto")(req, res, async (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });

      const { id } = req.params;
      const updateData = req.body;
      const category = await Category.findById(id);

      if (!category) {
        if (req.file) await fs.unlink(req.file.path);
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      if (updateData.categoryName && updateData.categoryName !== category.categoryName) {
        const existingCategory = await Category.findOne({ categoryName: new RegExp(`^${updateData.categoryName}$`, "i"), _id: { $ne: id } });
        if (existingCategory) {
          if (req.file) await fs.unlink(req.file.path);
          return res.status(400).json({ success: false, message: "Category name already exists" });
        }
      }

      if (updateData.categoryName) category.categoryName = updateData.categoryName.trim();
      if (updateData.status) category.status = updateData.status === "true";
      if (updateData.orderNo) category.orderNo = parseInt(updateData.orderNo);

      if (req.file) {
        if (category.categoryPhoto) await fs.unlink(path.join("public", category.categoryPhoto));
        category.categoryPhoto = `/uploads/categories/${req.file.filename}`;
      }

      await category.save();
      res.json({ success: true, message: "Category updated successfully", category });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete category (hard delete)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (category.categoryPhoto) {
      const photoPath = path.join("public", category.categoryPhoto);
      try {
        await fs.unlink(photoPath);
      } catch (error) {
        console.error("Error deleting photo file:", error);
      }
    }

    res.json({ success: true, message: "Category deleted successfully", category });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete category photo
const deleteCategoryPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    if (category.categoryPhoto) {
      await fs.unlink(path.join("public", category.categoryPhoto));
      category.categoryPhoto = "";
      await category.save();
    }

    res.json({ success: true, message: "Category photo deleted successfully", category });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export { getAllCategories, createCategory, updateCategory, deleteCategory, deleteCategoryPhoto };