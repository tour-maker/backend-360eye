import CareerRole from "../models/careerRoleModel.js";
import CareerSettings from "../models/careerSettingsModel.js";

// ---- Roles ----

export const getAllRoles = async (req, res) => {
  try {
    const filter = req.query.openOnly === "true" ? { isOpen: true } : {};
    const roles = await CareerRole.find(filter).sort({ roleOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching roles" });
  }
};

export const addRole = async (req, res) => {
  try {
    const { title, description = "", isOpen = true, roleOrder = 0 } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Role title is required" });
    }
    const role = new CareerRole({
      title: title.trim(),
      description,
      isOpen: isOpen === true || isOpen === "true",
      roleOrder: parseInt(roleOrder) || 0,
    });
    await role.save();
    res.status(201).json({ success: true, message: "Role created successfully", role });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating role" });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isOpen, roleOrder } = req.body;
    const role = await CareerRole.findById(id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    if (title !== undefined && title.trim()) role.title = title.trim();
    if (description !== undefined) role.description = description;
    if (isOpen !== undefined) role.isOpen = isOpen === true || isOpen === "true";
    if (roleOrder !== undefined) role.roleOrder = parseInt(roleOrder) || 0;
    await role.save();
    res.status(200).json({ success: true, message: "Role updated successfully", role });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating role" });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const role = await CareerRole.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    res.status(200).json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting role" });
  }
};

// ---- Settings ----

export const getSettings = async (req, res) => {
  try {
    let settings = await CareerSettings.findOne();
    if (!settings) {
      settings = await CareerSettings.create({});
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching settings" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { googleFormBaseUrl, roleEntryId, tagline, subline } = req.body;
    let settings = await CareerSettings.findOne();
    if (!settings) {
      settings = new CareerSettings({});
    }
    if (googleFormBaseUrl !== undefined) settings.googleFormBaseUrl = googleFormBaseUrl;
    if (roleEntryId !== undefined) settings.roleEntryId = roleEntryId;
    if (tagline !== undefined) settings.tagline = tagline;
    if (subline !== undefined) settings.subline = subline;
    await settings.save();
    res.status(200).json({ success: true, message: "Settings updated successfully", settings });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating settings" });
  }
};
