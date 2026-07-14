import express from "express";

import {
  getAllAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  addImages,
  uploadZipImages,
  deleteImage,
  getAlbumImages,
  updateImage,
  getUploadStatus,
} from "../../controllers/albumController.js";

import protect from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Album management routes
router.get("/", getAllAlbums);
router.post("/", protect, createAlbum);
router.put("/:id", protect, updateAlbum);
router.delete("/:id", protect, deleteAlbum);

// Image management routes
router.get("/images/:id", getAlbumImages);
router.post("/images", protect, addImages);
// Special middleware to handle CORS and large file uploads specifically for the upload-zip endpoint
router.post('/upload-zip', 
  (req, res, next) => {
    // Set CORS headers explicitly for this route
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    console.log('Processing ZIP upload request from:', req.headers.origin);
    next();
  },
  protect, 
  uploadZipImages
);
router.delete("/image", protect, deleteImage);

router.put("/images/:id", protect, updateImage); // Add this route for editing
router.delete("/images/:id", protect, deleteImage); // Modified to use :id parameter
// Background upload job status
router.get('/upload-status/:jobId', protect, getUploadStatus);
export default router;