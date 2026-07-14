import Album from "../models/albumModel.js";
import Image from "../models/imageModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import extractZip from "extract-zip";
import mongoose from "mongoose";



// In-memory job tracker for async ZIP processing
const uploadJobs = new Map();

function createJob(total = 0) {
  const jobId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id: jobId,
    status: 'pending', // pending | processing | done | error
    total: total,
    processed: 0,
    imagesAdded: 0,
    message: '',
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
  uploadJobs.set(jobId, job);
  return job;
}

function updateJob(jobId, patch) {
  if (!uploadJobs.has(jobId)) return;
  const job = uploadJobs.get(jobId);
  Object.assign(job, patch);
  uploadJobs.set(jobId, job);
}

async function optimizeImage(originalPath, outputDir) {
 
  const parsed = path.parse(originalPath);
  const baseOutputPath = path.join(outputDir, 'optimized');
  
  // Create optimized directory if it doesn't exist
  if (!fs.existsSync(baseOutputPath)) {
    fs.mkdirSync(baseOutputPath, { recursive: true });
  }

  const filename = parsed.name;
  const ext = parsed.ext;

  // Define output paths
  const paths = {
    thumb: path.join(baseOutputPath, `${filename}_thumb${ext}`),
    desktop: path.join(baseOutputPath, `${filename}_desktop${ext}`),
    tablet: path.join(baseOutputPath, `${filename}_tablet${ext}`),
    mobile: path.join(baseOutputPath, `${filename}_mobile${ext}`),
  };

  // Create optimized versions
  await Promise.all([
    // Thumbnail (200x200)
    sharp(originalPath)
      .resize(200, 200)
      .toFile(paths.thumb),
      
    // Desktop - prioritize height up to 2000px, maintain aspect ratio, no upscaling
    sharp(originalPath)
      .resize({ height: 2000, withoutEnlargement: true, fit: 'inside' })
      .toFile(paths.desktop),
      
    // Tablet - height up to 1200px
    sharp(originalPath)
      .resize({ height: 1200, withoutEnlargement: true, fit: 'inside' })
      .toFile(paths.tablet),
      
    // Mobile - height up to 800px
    sharp(originalPath)
      .resize({ height: 800, withoutEnlargement: true, fit: 'inside' })
      .toFile(paths.mobile),
  ]);

  // Return relative paths for database
  return {
    thumb: `/uploads/albums/${path.basename(outputDir)}/optimized/${filename}_thumb${ext}`,
    desktop: `/uploads/albums/${path.basename(outputDir)}/optimized/${filename}_desktop${ext}`,
    tablet: `/uploads/albums/${path.basename(outputDir)}/optimized/${filename}_tablet${ext}`,
    mobile: `/uploads/albums/${path.basename(outputDir)}/optimized/${filename}_mobile${ext}`,
  };
}


// Configure multer for upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/albums/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Special filter function that is more permissive with ZIP files
const fileFilter = (req, file, cb) => {
  // Log the file details for debugging
  console.log('Received file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // Accept any ZIP file
  if (file.originalname.toLowerCase().endsWith('.zip') || 
      file.mimetype === 'application/zip' || 
      file.mimetype === 'application/x-zip-compressed' || 
      file.mimetype === 'application/octet-stream') {
    console.log('Accepting ZIP file');
    cb(null, true);
  } 
  // Accept images
  else if (file.mimetype.startsWith("image/")) {
    console.log('Accepting image file');
    cb(null, true);
  } 
  // Reject other files
  else {
    console.log('Rejecting file - not a ZIP or image');
    cb(new Error("Invalid file type. Please upload an image or zip file."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2000 * 1024 * 1024, // 2GB limit (a more realistic limit)
  },
});



// Get all albums with pagination
const getAllAlbums = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const query = {};

    // Add search functionality
    if (search) {
      query.albumName = { $regex: search, $options: "i" };
    }

    const albums = await Album.find(query)
      .sort({ orderNo: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Album.countDocuments(query);

    res.json({
      success: true,
      albums,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalAlbums: total,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


const createAlbum = async (req, res) => {
  try {
    upload.single("albumPhoto")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const { albumName, albumDesc, status = "Yes", orderNo, albumType, albumExtraField } = req.body;

      if (!albumName) {
        return res.status(400).json({
          success: false,
          message: "Album name is required",
        });
      }

      const newAlbum = new Album({
        albumName,
        albumDesc,
        status,
        orderNo: parseInt(orderNo) || 0,
        albumType,  // Storing albumType
        albumExtraField: albumExtraField || "",  // Storing extra input field
        albumPhoto: req.file ? `/uploads/albums/${req.file.filename}` : "",
      });

      await newAlbum.save();
      res.status(201).json({
        success: true,
        message: "Album created successfully",
        album: newAlbum,
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



// Create a new album
// const createAlbum = async (req, res) => {
//   try {
//     upload.single("albumPhoto")(req, res, async (err) => {
//       if (err) {
//         return res.status(400).json({ success: false, message: err.message });
//       }

//       const { albumName, albumDesc, status = "Yes", orderNo } = req.body;

//       if (!albumName) {
//         return res.status(400).json({
//           success: false,
//           message: "Album name is required",
//         });
//       }

//       const newAlbum = new Album({
//         albumName,
//         albumDesc,
//         status,
//         orderNo: parseInt(orderNo) || 0,
//         albumPhoto: req.file ? `/uploads/albums/${req.file.filename}` : "",
//       });

//       await newAlbum.save();
//       res.status(201).json({
//         success: true,
//         message: "Album created successfully",
//         album: newAlbum,
//       });
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server error", error: error.message });
//   }
// };

// Get images for a specific album
const getAlbumImages = async (req, res) => {
  try {
    const albumId = req.params.id;

    // Find all images for the album and sort by imageOrder
    const images = await Image.find({ albumName: albumId })
      .sort({ imageOrder: 1, _id: 1 })
      .lean(); // Convert to plain JavaScript objects

    // Get album details
    const album = await Album.findById(albumId).lean();

    if (!album) {
      return res.status(404).json({ 
        success: false, 
        message: "Album not found" 
      });
    }

    // Transform each image to match your desired format
    const formattedImages = images.map(image => ({
      _id: image._id,
      albumName: image.albumName,
      imageStatus: image.imageStatus || "Yes",
      imageOrder: image.imageOrder || 0,
      thumbPhoto: image.thumbPhoto || "",
      desktopPhoto: image.desktopPhoto || "",
      tabletPhoto: image.tabletPhoto || "",
      mobilePhoto: image.mobilePhoto || "",
      imageDescription: image.description || "",
      projectname: image.projectname || "",
      architake: image.architake || "",
      aria: image.aria || "",
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      __v: image.__v || 0
    }));

    res.json({
      success: true,
      images: formattedImages,
      albumName: album.albumName,
      totalImages: images.length,
    });
  } catch (error) {
    console.error("Error fetching album images:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Add images to album
const addImages = async (req, res) => {
  try {
    const upload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
          cb(null, true);
        } else {
          cb(new Error("Not an image! Please upload images only."), false);
        }
      },
    }).fields([
      { name: "thumbPhoto", maxCount: 1 },
      { name: "desktopPhoto", maxCount: 1 },
      { name: "tabletPhoto", maxCount: 1 },
      { name: "mobilePhoto", maxCount: 1 },
    ]);

    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const {
        albumId,
        imageStatus = "Yes",
        imageOrder,
        imageDescription,
      } = req.body;

      const imageData = {
        albumName: albumId,
        imageStatus,
        imageOrder: parseInt(imageOrder) || 0,
        imageDescription,
      };

      // Add uploaded image paths
      if (req.files) {
        if (req.files.thumbPhoto) {
          imageData.thumbPhoto = `/uploads/albums/${req.files.thumbPhoto[0].filename}`;
        }
        if (req.files.desktopPhoto) {
          imageData.desktopPhoto = `/uploads/albums/${req.files.desktopPhoto[0].filename}`;
        }
        if (req.files.tabletPhoto) {
          imageData.tabletPhoto = `/uploads/albums/${req.files.tabletPhoto[0].filename}`;
        }
        if (req.files.mobilePhoto) {
          imageData.mobilePhoto = `/uploads/albums/${req.files.mobilePhoto[0].filename}`;
        }
      }

      const newImage = new Image(imageData);
      await newImage.save();

      res.status(201).json({
        success: true,
        message: "Image added successfully",
        image: newImage,
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// Helper function to recursively find image files in all subdirectories
const findImagesRecursively = (dir) => {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      const subResults = findImagesRecursively(fullPath);
      results = results.concat(subResults.map(subPath => path.join(file, subPath)));
    } else if (/\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif)$/i.test(file)) {
      // This is an image file
      results.push(file);
    }
  }
  
  return results;
};


// Upload images via zip file - now processed in background with status tracking
const uploadZipImages = async (req, res) => {
  try {
    // First set explicit CORS headers to resolve CORS issues
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length');
    // Add additional headers for better handling of large file uploads
    res.header('Connection', 'keep-alive');
    res.header('Keep-Alive', 'timeout=1800'); // 30 minutes in seconds
    
    // Log start of upload handler
    console.log('ZIP upload handler started');
    console.log('Received headers:', req.headers);
    console.log('Request origin:', req.headers.origin);
    
    // Create a separate multer instance with more permissive limits specifically for ZIP uploads
    const zipUpload = multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 2000 * 1024 * 1024, // 2GB limit
      },
    }).single("zipFile");
    
    zipUpload(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No zip file provided" });
      }

      // Log received file details
      console.log(`Received ZIP file: ${req.file.originalname}, size: ${req.file.size} bytes`);

      const { albumId } = req.body;
      if (!albumId) {
        return res.status(400).json({ success: false, message: "Album ID is required" });
      }

      // Validate album exists
      const album = await Album.findById(albumId);
      if (!album) {
        return res.status(404).json({ success: false, message: "Album not found" });
      }

      // Create job and respond immediately
      const job = createJob(0);
      updateJob(job.id, { status: 'processing', message: 'Starting extraction...' });

      res.json({ success: true, message: 'Upload accepted, processing in background', jobId: job.id });

      // Continue processing asynchronously
      (async () => {
        try {
          // Create extraction directory
          const timestamp = Date.now();
          const extractPath = path.resolve(`public/uploads/albums/${album._id.toString()}_${timestamp}`);
          console.log(`Creating extraction directory: ${extractPath}`);
          fs.mkdirSync(extractPath, { recursive: true });

          // Extract ZIP
          console.log(`Starting ZIP extraction for file: ${req.file.path}`);
          try {
            await extractZip(path.resolve(req.file.path), { dir: extractPath });
            console.log('ZIP extraction completed successfully');
          } catch (extractError) {
            console.error('ZIP extraction failed:', extractError);
            updateJob(job.id, { status: 'error', error: extractError.message, message: 'Failed to extract ZIP', finishedAt: Date.now() });
            return;
          }

          // Collect images recursively
          const relativeImagePaths = findImagesRecursively(extractPath);
          const imageFiles = relativeImagePaths.filter(file => /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif)$/i.test(file));

          if (imageFiles.length === 0) {
            updateJob(job.id, { status: 'error', message: 'No image files found in the ZIP archive', finishedAt: Date.now() });
            return;
          }

          updateJob(job.id, { total: imageFiles.length, message: `Found ${imageFiles.length} images` });

          // Determine base order to append after existing images
          let baseOrder = 0;
          try {
            const maxOrderDoc = await Image.find({ albumName: albumId })
              .sort({ imageOrder: -1 })
              .limit(1)
              .lean();
            baseOrder = maxOrderDoc.length ? (Number(maxOrderDoc[0].imageOrder) || 0) : 0;
          } catch (e) {
            console.warn('Could not determine existing max imageOrder, defaulting to 0:', e.message);
            baseOrder = 0;
          }

          // Process images in batches to prevent memory issues with large ZIPs
          const BATCH_SIZE = 20; // Process 20 images at a time
          const totalBatches = Math.ceil(imageFiles.length / BATCH_SIZE);
          let imagesAdded = 0;
          
          console.log(`Will process images in ${totalBatches} batches of ${BATCH_SIZE}`);
          
          // Process batches sequentially
          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, imageFiles.length);
            const batchFiles = imageFiles.slice(start, end);
            
            console.log(`Processing batch ${batchIndex + 1}/${totalBatches} with ${batchFiles.length} images`);
            updateJob(job.id, { message: `Processing batch ${batchIndex + 1}/${totalBatches}` });
            
            const batchPromises = batchFiles.map(async (file, index) => {
              try {
                const originalPath = path.join(extractPath, file);

                // Optimize
                const optimizedPaths = await optimizeImage(originalPath, path.dirname(originalPath));

                // Title and order
                const title = path.parse(file).name;
                let parsedOrder = null;
                const match = title.match(/^(\d+)/);
                if (match) parsedOrder = Number(match[1]);

                const newImage = new Image({
                  albumName: albumId,
                  imageOrder: parsedOrder !== null ? parsedOrder : (baseOrder + start + index + 1),
                  title: title,
                  description: "",
                  subtitle: "",
                  thumbPhoto: optimizedPaths.thumb,
                  desktopPhoto: optimizedPaths.desktop,
                  tabletPhoto: optimizedPaths.tablet,
                  mobilePhoto: optimizedPaths.mobile,
                  imageStatus: "Yes",
                });

                const saved = await newImage.save();
                return saved ? 1 : 0;
              } catch (error) {
                console.error(`Error processing image ${file}:`, error);
                return 0;
              }
            });

            const batchResults = await Promise.all(batchPromises);
            const addedNow = batchResults.reduce((a, b) => a + b, 0);
            imagesAdded += addedNow;
            updateJob(job.id, { processed: end, imagesAdded });
          }

          // Cleanup zip file
          try {
            fs.unlinkSync(req.file.path);
          } catch {}

          updateJob(job.id, { status: 'done', message: 'Processing completed', imagesAdded, finishedAt: Date.now() });
        } catch (error) {
          console.error('Error processing zip file (async):', error);
          updateJob(job.id, { status: 'error', error: error.message, message: 'Processing failed', finishedAt: Date.now() });
        }
      })();
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get background upload status by jobId
const getUploadStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId || !uploadJobs.has(jobId)) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    const job = uploadJobs.get(jobId);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update album
const updateAlbum = async (req, res) => {
  try {
    upload.single("albumPhoto")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      const { albumName, status, orderNo, albumType, albumExtraField } = req.body;
      const albumId = req.params.id;

      const updateData = {};
      if (albumName) updateData.albumName = albumName;
      if (status) updateData.status = status;
      if (orderNo) updateData.orderNo = parseInt(orderNo);
      if (albumType) updateData.albumType = albumType;  // Updating albumType
      if (albumExtraField) updateData.albumExtraField = albumExtraField;  // Updating extra field

      if (req.file) {
        updateData.albumPhoto = `/uploads/albums/${req.file.filename}`;
      }

      const album = await Album.findByIdAndUpdate(albumId, updateData, {
        new: true,
      });

      if (!album) {
        return res.status(404).json({ success: false, message: "Album not found" });
      }

      res.json({
        success: true,
        message: "Album updated successfully",
        album,
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete album
const deleteAlbum = async (req, res) => {
  try {
    const albumId  = req.params.id;

    // Delete all images associated with the album
    await Image.deleteMany({ albumName: albumId });

    // Delete the album
    const album = await Album.findByIdAndDelete(albumId);

    if (!album) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }

    res.json({
      success: true,
      message: "Album and associated images deleted successfully",
      album,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete single image
const deleteImage = async (req, res) => {
  try {
    const  imageId  = req.params.id;

    const image = await Image.findByIdAndDelete(imageId);

    if (!image) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    res.json({
      success: true,
      message: "Image deleted successfully",
      image,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


const updateImage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const updates = req.body;

    // Debugging: Log incoming data
    console.log('Incoming update data:', updates);
    console.log('Update target ID:', id);

    // Validate the ID format first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid image ID format" 
      });
    }

    // Prepare the update object with only allowed fields
    const allowedFields = [
      'imageStatus',
      'imageOrder',
      'thumbPhoto',
      'desktopPhoto',
      'tabletPhoto',
      'mobilePhoto',
      'imageDescription',
      'projectname',
      'architake',
      'aria'
    ];

    const updatePayload = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updatePayload[key] = updates[key];
      }
    });

    // Debugging: Log the filtered update payload
    console.log('Filtered update payload:', updatePayload);

    // Perform the update with validation
    const updatedImage = await Image.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      {
        new: true,
        runValidators: true, // Ensure schema validations run
        session
      }
    );

    if (!updatedImage) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Image not found" 
      });
    }

    await session.commitTransaction();
    
    // Debugging: Log the successfully updated image
    console.log('Successfully updated image:', updatedImage);

    res.json({ 
      success: true, 
      image: updatedImage,
      updatedFields: Object.keys(updatePayload)
    });

  } catch (error) {
    await session.abortTransaction();
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    // Handle other errors
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update image",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};


export {
  getAllAlbums,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumImages,
  addImages,
  uploadZipImages,
  deleteImage,
  updateImage,
  getUploadStatus
};
