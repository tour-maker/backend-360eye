import Area from "../models/areaModel.js";

// Create a new area
export const createArea = async (req, res) => {
  try {
    const { area } = req.body;

    // Check if the area already exists
    const existingArea = await Area.findOne({ area });
    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: "Area already exists",
      });
    }

    const newArea = new Area({ area });
    await newArea.save();

    res.status(201).json({
      success: true,
      message: "Area created successfully",
      area: newArea,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create area",
      error: error.message,
    });
  }
};

// Fetch all areas
export const fetchAreas = async (req, res) => {
  try {
    const areas = await Area.find();

    res.status(200).json({
      success: true,
      message: "Areas fetched successfully",
      areas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch areas",
      error: error.message,
    });
  }
};

// ✅ Update an area
export const updateArea = async (req, res) => {
  try {
    const { area } = req.body;
    
    if (!area) {
      return res.status(400).json({ success: false, message: "Area name is required" });
    }

    const areaName = area.trim().toUpperCase();

    const updatedArea = await Area.findByIdAndUpdate(
      req.params.id,
      { area: areaName },
      { new: true }
    );

    if (!updatedArea) {
      return res.status(404).json({ success: false, message: "Area not found" });
    }

    res.json({ success: true, message: "Area updated successfully", area: updatedArea });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update area", error: error.message });
  }
};

// ✅ Delete an area
export const deleteArea = async (req, res) => {
  try {
    const deletedArea = await Area.findByIdAndDelete(req.params.id);

    if (!deletedArea) {
      return res.status(404).json({ success: false, message: "Area not found" });
    }

    res.json({ success: true, message: "Area deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete area", error: error.message });
  }
};
