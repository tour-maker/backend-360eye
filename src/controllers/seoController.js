import SEO from "../models/seoModel.js";
import multer from "multer";
import path from "path";

// Configure multer for thumbnail upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/seo/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Invalid file type. Please upload an image file."), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Get all SEO entries
const getAllSEOs = async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? {
          $or: [
            { pageUrl: { $regex: search, $options: "i" } },
            { pageTitle: { $regex: search, $options: "i" } },
            { keyword: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const seos = await SEO.find(query).sort({ createdAt: -1 });
    res.json({ success: true, seos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Create new SEO entry
const createSEO = async (req, res) => {
  try {
    upload.single("thumbnail")(req, res, async (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      const { pageUrl, metadata, keyword, pageTitle, pageDescription } = req.body;

      if (!pageUrl || !keyword || !pageTitle || !pageDescription) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      const existingSEO = await SEO.findOne({ pageUrl });
      if (existingSEO)
        return res.status(400).json({ success: false, message: "SEO entry for this page URL already exists" });

      const newSEO = new SEO({
        pageUrl,
        metadata,
        keyword,
        pageTitle,
        pageDescription,
        thumbnail: req.file ? `/uploads/seo/${req.file.filename}` : "",
      });

      await newSEO.save();
      res.status(201).json({ success: true, message: "SEO entry created successfully", seo: newSEO });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Get single SEO entry
const getSEOById = async (req, res) => {
  try {
    const seo = await SEO.findById(req.params.id);
    if (!seo) return res.status(404).json({ success: false, message: "SEO entry not found" });
    res.json({ success: true, seo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Update SEO entry
const updateSEO = async (req, res) => {
  try {
    upload.single("thumbnail")(req, res, async (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });

      const { pageUrl, metadata, keyword, pageTitle, pageDescription } = req.body;
      const seoId = req.params.id;

      const updateData = {
        ...(pageUrl && { pageUrl }),
        ...(metadata && { metadata }),
        ...(keyword && { keyword }),
        ...(pageTitle && { pageTitle }),
        ...(pageDescription && { pageDescription }),
        ...(req.file && { thumbnail: `/uploads/seo/${req.file.filename}` }),
      };

      if (pageUrl) {
        const existingSEO = await SEO.findOne({ pageUrl, _id: { $ne: seoId } });
        if (existingSEO)
          return res.status(400).json({ success: false, message: "SEO entry for this page URL already exists" });
      }

      const seo = await SEO.findByIdAndUpdate(seoId, updateData, { new: true });
      if (!seo) return res.status(404).json({ success: false, message: "SEO entry not found" });

      res.json({ success: true, message: "SEO entry updated successfully", seo });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete SEO entry
const deleteSEO = async (req, res) => {
  try {
    const seo = await SEO.findByIdAndDelete(req.params.id);
    if (!seo) return res.status(404).json({ success: false, message: "SEO entry not found" });
    res.json({ success: true, message: "SEO entry deleted successfully", seo });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export { getAllSEOs, createSEO, deleteSEO, updateSEO, getSEOById };
