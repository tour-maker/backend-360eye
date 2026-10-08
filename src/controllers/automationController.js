import Product from "../models/productModel.js";
import Filter from "../models/filterModel.js";

// GET /admin/automation/schema
// Returns the current filter groups (Unit Type, Features, any future group) with their live options.
export const getAutomationSchema = async (req, res) => {
  try {
    const filters = await Filter.find().sort({ filterOrder: 1 });
    res.status(200).json({
      success: true,
      groups: filters.map((f) => ({
        name: f.name,
        options: f.options || [],
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching filter schema" });
  }
};

// GET /admin/automation/products
// Returns every product with its current tags, for the sheet to sync rows against.
export const getAutomationProducts = async (req, res) => {
  try {
    const products = await Product.find({}, { tourName: 1, bhkType: 1, filterTags: 1 }).sort({ tourOrder: 1 });
    res.status(200).json({
      success: true,
      products: products.map((p) => ({
        id: p._id.toString(),
        tourName: p.tourName,
        bhkType: p.bhkType || [],
        filterTags: p.filterTags || {},
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching products" });
  }
};

// POST /admin/automation/tag
// body: { productId, group, option, value }
// Ticks/unticks one option for one product. Uses an atomic $addToSet/$pull update
// (not a full document .save()) so it never re-validates unrelated fields on old
// records and can't be blocked by unrelated bad data on that document.
export const setAutomationTag = async (req, res) => {
  try {
    const { productId, group, option, value } = req.body;

    if (!productId || !group || !option || typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "productId, group, option, and value (boolean) are all required",
      });
    }

    const isUnitType = group.trim().toLowerCase() === "unit type";
    const path = isUnitType ? "bhkType" : `filterTags.${group}`;
    const update = value ? { $addToSet: { [path]: option } } : { $pull: { [path]: option } };

    const updated = await Product.findByIdAndUpdate(productId, update, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      product: { id: updated._id.toString(), bhkType: updated.bhkType, filterTags: updated.filterTags },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating tag" });
  }
};
