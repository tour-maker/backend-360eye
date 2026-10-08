import mongoose from "mongoose";
import Product from "../models/productModel.js";

// Show/hide a tour on the public website. Hidden tours keep working by direct URL.
// Atomic single-field update on purpose (no full-document validation).
export const setProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { productStatus } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid tour id" });
    }
    if (!["Yes", "No"].includes(productStatus)) {
      return res.status(400).json({ success: false, message: "productStatus must be Yes or No" });
    }
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { productStatus } },
      { new: true, runValidators: true }
    ).select("tourName productStatus");
    if (!product) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
