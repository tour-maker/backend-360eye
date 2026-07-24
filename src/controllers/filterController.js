import Filter from "../models/filterModel.js";

// Get all filters (public - used by frontend to render filter buttons)
export const getAllFilters = async (req, res) => {
  try {
    const filters = await Filter.find().sort({ filterOrder: 1 });
    res.status(200).json({
      success: true,
      filters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching filters",
    });
  }
};

// Get single filter by ID (admin)
export const getFilter = async (req, res) => {
  try {
    const filter = await Filter.findById(req.params.id);
    if (!filter) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }
    res.status(200).json({ success: true, filter });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching filter" });
  }
};

// Create a new filter category
export const addFilter = async (req, res) => {
  try {
    const { name, options = [], multiSelect = true, filterOrder = 0 } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Filter name is required" });
    }

    const existing = await Filter.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "A filter with this name already exists" });
    }

    const filter = new Filter({
      name: name.trim(),
      options: Array.isArray(options) ? options.filter(Boolean) : [],
      multiSelect: multiSelect === true || multiSelect === "true",
      filterOrder: parseInt(filterOrder) || 0,
    });

    await filter.save();
    res.status(201).json({ success: true, message: "Filter created successfully", filter });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating filter" });
  }
};

// Update a filter (rename, change options, reorder)
export const updateFilter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, options, multiSelect, filterOrder } = req.body;

    const filter = await Filter.findById(id);
    if (!filter) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }

    if (name !== undefined && name.trim()) {
      filter.name = name.trim();
    }
    if (options !== undefined) {
      filter.options = Array.isArray(options) ? options.filter(Boolean) : [];
    }
    if (multiSelect !== undefined) {
      filter.multiSelect = multiSelect === true || multiSelect === "true";
    }
    if (filterOrder !== undefined) {
      filter.filterOrder = parseInt(filterOrder) || 0;
    }

    await filter.save();
    res.status(200).json({ success: true, message: "Filter updated successfully", filter });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating filter" });
  }
};

// Delete a filter
export const deleteFilter = async (req, res) => {
  try {
    const filter = await Filter.findByIdAndDelete(req.params.id);
    if (!filter) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }
    res.status(200).json({ success: true, message: "Filter deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting filter" });
  }
};
