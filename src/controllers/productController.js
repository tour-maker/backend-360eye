import Product from "../models/productModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import {
  createTourAccessToken,
  TOUR_ACCESS_COOKIE_NAME,
} from "../utils/tourAccessToken.js";

const PASSWORD_SALT_ROUNDS = 12;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/products";
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "products-" + uniqueSuffix + path.extname(file.originalname));
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


const getAllProducts = async (req, res) => {
  try {
    console.log("Incoming query params:", req.query); // Debug log
    
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const query = { 
      categoryType: req.query.categoryType || "Virtual Tour" 
    };

    const rawStatusFilter = req.query.status || req.query.productStatus;
    if (rawStatusFilter !== undefined) {
      const values = Array.isArray(rawStatusFilter)
        ? rawStatusFilter
        : String(rawStatusFilter).split(",");

      const normalizedStatuses = values
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .map((entry) => {
          const upper = entry.toUpperCase();
          if (upper === "YES") return "Yes";
          if (upper === "NO") return "No";
          return null;
        })
        .filter(Boolean);

      if (normalizedStatuses.length === 1) {
        query.productStatus = normalizedStatuses[0];
      } else if (normalizedStatuses.length > 1) {
        query.productStatus = { $in: normalizedStatuses };
      }
    }

    const hasExplicitStatusFilter = query.productStatus !== undefined;
    const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";
    const includeAllStatus = String(req.query.status || "").trim().toLowerCase() === "all";
    const hasAuthHeader = Boolean(req.headers.authorization);

    if (!hasExplicitStatusFilter && !includeInactive && !includeAllStatus && !hasAuthHeader) {
      query.productStatus = "Yes";
    }

    console.log("Final MongoDB query:", query); // Debug log
    
    // Execute query with pagination
    const products = await Product.find(query)
      .sort({ tourOrder: 1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Add .lean() for faster queries

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    
    console.log(`Found products: ${products.length} of ${totalProducts} total`); // Debug log
    
    // Return paginated data with metadata
    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        totalProducts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error("Full error stack:", error);
    res.status(500).json({
      success: false,
      message: "Server error - " + error.message
    });
  }
};

// Create a new product with image upload
const createProduct = async (req, res) => {
  try {
    upload.single("thumbImage")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      const {
        
        categoryType,
        productStatus = "Yes",
        productLocation = "",
        propertyType,
        propertyStatus,
        area,
        productSmallDetail = "",
        tourName,
        tourURL,
        tourOrder = 0,
        urlName,
        googleAnalyticsId = "",
        bhkType: bhkTypeRaw,
        plotStatus = "",
        hasVoiceOver = false,
        viewMode = "Day",
      } = req.body;

      if (
         
        !categoryType ||
        !propertyType ||
        !propertyStatus ||
        !area ||
        !tourName ||
        !tourURL ||
        !urlName
      ) {
        return res.status(400).json({
          success: false,
          message: "Required fields are missing",
          required: [
            
            "categoryType",
            "propertyType",
            "propertyStatus",
            "area",
            "tourName",
            "tourURL",
            "urlName",
          ],
        });
      }

      if (productStatus && !["Yes", "No"].includes(productStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product status. Must be 'Yes' or 'No'",
        });
      }

      let bhkType = [];
      try {
        const parsed = typeof bhkTypeRaw === "string" ? JSON.parse(bhkTypeRaw) : bhkTypeRaw;
        bhkType = Array.isArray(parsed) ? parsed.filter(Boolean) : (parsed ? [parsed] : []);
      } catch {
        bhkType = bhkTypeRaw ? [bhkTypeRaw] : [];
      }

      const newProduct = new Product({
       
        categoryType,
        productStatus,
        productLocation,
        propertyType,
        propertyStatus,
        area,
        productSmallDetail,
        tourName,
        tourURL,
        tourOrder: parseInt(tourOrder),
        urlName,
        googleAnalyticsId,
        bhkType,
        plotStatus,
        hasVoiceOver: hasVoiceOver === "true" || hasVoiceOver === true,
        viewMode,
        thumbImage: req.file ? `/uploads/products/${req.file.filename}` : "",
      });

      await newProduct.save();
      res.status(201).json({
        success: true,
        message: "Product created successfully",
        product: newProduct,
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

// Update product by tourOrder and mainCategory
const updateProduct = async (req, res) => {
  try {
    upload.single("thumbImage")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      const { id } = req.params; // Get the product ID from the URL params
      const updateData = req.body; // Get the updated data from the request body
      if (updateData.hasVoiceOver !== undefined) {
        updateData.hasVoiceOver = updateData.hasVoiceOver === "true" || updateData.hasVoiceOver === true;
      }

      if (updateData.bhkType !== undefined) {
        try {
          const parsed = typeof updateData.bhkType === "string" ? JSON.parse(updateData.bhkType) : updateData.bhkType;
          updateData.bhkType = Array.isArray(parsed) ? parsed.filter(Boolean) : (parsed ? [parsed] : []);
        } catch {
          updateData.bhkType = updateData.bhkType ? [updateData.bhkType] : [];
        }
      }

      // Find the product by ID
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Validate productStatus (if provided)
      if (
        updateData.productStatus &&
        !["Yes", "No"].includes(updateData.productStatus)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product status. Must be 'Yes' or 'No'",
        });
      }

      // Update the product fields (excluding password fields handled separately)
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          if (key === "tourOrder") {
            product[key] = parseInt(updateData[key]); // Ensure tourOrder is a number
          } else if (!["tourPassword", "tourPasswordEnabled", "tourPasswordHash"].includes(key)) {
            product[key] = updateData[key];
          }
        }
      });

      if (updateData.googleAnalyticsId !== undefined) {
        product.googleAnalyticsId = updateData.googleAnalyticsId;
      }

      // Update the thumbImage if a new file is uploaded
      if (req.file) {
        product.thumbImage = `/uploads/products/${req.file.filename}`;
      }

      // Save the updated product
      await product.save();

      // Send success response
      res.json({
        success: true,
        message: "Product updated successfully",
        product,
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

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByIdAndDelete({
      _id: productId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Helper function to delete thumb image
const deleteThumbImage = async (req, res) => {
  try {
    const { mainCategory, tourOrder } = req.query;

    const product = await Product.findOne({
      mainCategory,
      tourOrder: parseInt(tourOrder),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.thumbImage = "";
    await product.save();

    res.json({
      success: true,
      message: "Thumb image deleted successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const verifyProductPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Tour identifier is required",
      });
    }

    if (typeof password !== "string" || password.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const product = await Product.findById(id).select("+tourPasswordHash");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Tour not found",
      });
    }

    if (!product.tourPasswordEnabled || !product.tourPasswordHash) {
      return res.status(400).json({
        success: false,
        message: "This tour is not password protected",
      });
    }

    const isMatch = await bcrypt.compare(password.trim(), product.tourPasswordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const accessToken = createTourAccessToken(product._id.toString());

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie(TOUR_ACCESS_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: "/",
      domain: req.hostname.includes('.360eye.in') ? '.360eye.in' : undefined, // Set domain to parent domain for cross-subdomain access
    });

    res.json({
      success: true,
      message: "Password verified",
      tour: {
        id: product._id,
        tourName: product.tourName,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Error verifying tour password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { category,categoryType } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category parameter is required",
      });
    }

    const query = { mainCategory: category ,categoryType: categoryType};

    const products = await Product.find(query).sort({ tourOrder: 1 });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for this category",
      });
    }

    res.json({
      success: true,
      products,
      totalProducts: products.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateProductPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const product = await Product.findById(id).select("+tourPasswordHash");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (typeof password === "string" && password.trim().length > 0) {
      if (password.length < 4) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 4 characters long",
        });
      }

      const hash = await bcrypt.hash(password.trim(), PASSWORD_SALT_ROUNDS);
      product.tourPasswordHash = hash;
      product.tourPasswordEnabled = true;
      product.tourPasswordUpdatedAt = new Date();
    } else {
      product.tourPasswordHash = null;
      product.tourPasswordEnabled = false;
      product.tourPasswordUpdatedAt = null;
    }

    await product.save();

    const responseProduct = {
      _id: product._id,
      tourName: product.tourName,
      tourPasswordEnabled: product.tourPasswordEnabled,
      tourPasswordUpdatedAt: product.tourPasswordUpdatedAt,
    };

    res.json({
      success: true,
      message: product.tourPasswordEnabled
        ? "Password updated successfully"
        : "Password removed successfully",
      product: responseProduct,
    });
  } catch (error) {
    console.error("Error updating product password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteThumbImage,
  getProductsByCategory,
  updateProductPassword,
  verifyProductPassword,
};
