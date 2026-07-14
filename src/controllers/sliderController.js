import Slider from "../models/sliderModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "public/uploads/sliders";

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // Create directory if not exists
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb("Error: Images only!");
    }
  },
}).single("clientLogo");

// Get all sliders
export const getAllSliders = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const query = search ? { title: { $regex: search, $options: "i" } } : {};

    const sliders = await Slider.find(query).sort({ sliderOrder: 1 });

    res.status(200).json({
      success: true,
      sliders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sliders",
      error: error.message,
    });
  }
};

// Add new slider
export const addSlider = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Error uploading file",
        error: err,
      });
    }

    try {
      const { title, sliderLink, sliderOrder, sliderStatus } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Client logo is required",
        });
      }

      const newSlider = new Slider({
        title,
        sliderLink,
        sliderOrder,
        sliderStatus: sliderStatus || "Yes",
        clientLogo: req.file.filename,
      });

      const savedSlider = await newSlider.save();

      res.status(201).json({
        success: true,
        message: "Slider added successfully",
        slider: savedSlider,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error adding slider",
        error: error.message,
      });
    }
  });
};

// Update slider
export const updateSlider = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Error uploading file",
        error: err,
      });
    }

    try {
      const { id } = req.params;
      const updateData = {
        title: req.body.title,
        sliderLink: req.body.sliderLink,
        sliderOrder: req.body.sliderOrder,
        sliderStatus: req.body.sliderStatus,
      };

      if (req.file) {
        updateData.clientLogo = req.file.filename;
      }

      const updatedSlider = await Slider.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updatedSlider) {
        return res.status(404).json({
          success: false,
          message: "Slider not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Slider updated successfully",
        slider: updatedSlider,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating slider",
        error: error.message,
      });
    }
  });
};

// Delete slider
export const deleteSlider = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSlider = await Slider.findByIdAndDelete(id);

    if (!deletedSlider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Slider deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting slider",
      error: error.message,
    });
  }
};

// Get single slider
export const getSlider = async (req, res) => {
  try {
    const { id } = req.params;
    const slider = await Slider.findById(id);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    res.status(200).json({
      success: true,
      slider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching slider",
      error: error.message,
    });
  }
};

// Update slider order
export const updateSliderOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { sliderOrder } = req.body;

    if (sliderOrder === undefined || sliderOrder === null) {
      return res.status(400).json({
        success: false,
        message: "Slider order is required",
      });
    }

    const updatedSlider = await Slider.findByIdAndUpdate(
      id,
      { sliderOrder },
      { new: true, runValidators: true }
    );

    if (!updatedSlider) {
      return res.status(404).json({
        success: false,
        message: "Slider not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Slider order updated successfully",
      slider: updatedSlider,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating slider order",
      error: error.message,
    });
  }
};
