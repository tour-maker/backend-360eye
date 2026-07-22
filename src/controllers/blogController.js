import Blog from "../models/blogModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for blog thumbnail upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "public/uploads/blogs";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `blog-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5000000 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb("Error: Images only!");
  },
}).single("thumbnail");

// Helper: generate slug from title
const generateSlug = (title) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// GET all blogs
export const getAllBlogs = async (req, res) => {
  try {
    const { search = "", status } = req.query;
    const query = {};
    if (search) query.title = { $regex: search, $options: "i" };
    if (status) query.status = status;

    const blogs = await Blog.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching blogs", error: error.message });
  }
};

// GET single blog by ID
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.status(200).json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching blog", error: error.message });
  }
};

// GET single blog by slug (for frontend)
export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.status(200).json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching blog", error: error.message });
  }
};

// POST create blog
export const createBlog = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: "Error uploading file", error: err });

    try {
      const { title, shortDescription, content, author, tags, status } = req.body;

      const slug = generateSlug(title);

      // Check slug uniqueness
      const existing = await Blog.findOne({ slug });
      if (existing) {
        return res.status(400).json({ success: false, message: "A blog with this title already exists" });
      }

      const newBlog = new Blog({
        title,
        slug,
        shortDescription,
        content,
        author: author || "360 EYE Team",
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())) : [],
        status: status || "published",
        thumbnail: req.file ? req.file.filename : null,
      });

      const saved = await newBlog.save();
      res.status(201).json({ success: true, message: "Blog created successfully", blog: saved });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error creating blog", error: error.message });
    }
  });
};

// PUT update blog
export const updateBlog = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: "Error uploading file", error: err });

    try {
      const { title, shortDescription, content, author, tags, status } = req.body;

      const updateData = {
        title,
        shortDescription,
        content,
        author,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim())) : [],
        status,
      };

      // Regenerate slug if title changed
      if (title) updateData.slug = generateSlug(title);

      if (req.file) updateData.thumbnail = req.file.filename;

      const updated = await Blog.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ success: false, message: "Blog not found" });

      res.status(200).json({ success: true, message: "Blog updated successfully", blog: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating blog", error: error.message });
    }
  });
};

// DELETE blog
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    // Delete thumbnail file if exists
    if (blog.thumbnail) {
      const filePath = path.join("public/uploads/blogs", blog.thumbnail);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.status(200).json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting blog", error: error.message });
  }
};