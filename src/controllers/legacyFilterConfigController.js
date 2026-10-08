import LegacyFilterConfig from "../models/legacyFilterConfigModel.js";

const ALLOWED_KEYS = ["propertyType", "propertyStatus", "area"];

export const getLegacyFilterConfigs = async (req, res) => {
  try {
    const configs = await LegacyFilterConfig.find({});
    res.status(200).json({ success: true, configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertLegacyFilterConfig = async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: "Invalid legacy filter key" });
    }
    const update = {};
    if (typeof req.body.label === "string") update.label = req.body.label.trim();
    if (typeof req.body.hidden === "boolean") update.hidden = req.body.hidden;

    const config = await LegacyFilterConfig.findOneAndUpdate(
      { key },
      { $set: update },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
