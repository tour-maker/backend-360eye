import ClientAccess from "../models/clientAccessModel.js";

// Helper: generate a URL-safe slug from a name
const generateSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// ADMIN: get all client access entries
export const getAllClientAccess = async (req, res) => {
  try {
    const clients = await ClientAccess.find()
      .populate("assignedTours", "tourName thumbImage")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, clients });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching clients", error: error.message });
  }
};

// ADMIN: get single client access entry by ID
export const getClientAccessById = async (req, res) => {
  try {
    const client = await ClientAccess.findById(req.params.id).populate("assignedTours", "tourName thumbImage");
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });
    res.status(200).json({ success: true, client });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching client", error: error.message });
  }
};

// ADMIN: create client access
export const createClientAccess = async (req, res) => {
  try {
    const { clientName, slug, assignedTours = [], expiresAt = null, isActive = true, notes = "" } = req.body;

    if (!clientName) {
      return res.status(400).json({ success: false, message: "Client name is required" });
    }

    const finalSlug = slug ? generateSlug(slug) : generateSlug(clientName);

    const existing = await ClientAccess.findOne({ slug: finalSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: "This URL slug is already in use" });
    }

    const newClient = new ClientAccess({
      clientName,
      slug: finalSlug,
      assignedTours,
      expiresAt: expiresAt || null,
      isActive,
      notes,
    });

    const saved = await newClient.save();
    res.status(201).json({ success: true, message: "Client access created successfully", client: saved });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating client access", error: error.message });
  }
};

// ADMIN: update client access
export const updateClientAccess = async (req, res) => {
  try {
    const { clientName, slug, assignedTours, expiresAt, isActive, notes } = req.body;

    const updateData = {};
    if (clientName !== undefined) updateData.clientName = clientName;
    if (assignedTours !== undefined) updateData.assignedTours = assignedTours;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;

    if (slug !== undefined) {
      const finalSlug = generateSlug(slug);
      const existing = await ClientAccess.findOne({ slug: finalSlug, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: "This URL slug is already in use" });
      }
      updateData.slug = finalSlug;
    }

    const updated = await ClientAccess.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedTours", "tourName thumbImage");

    if (!updated) return res.status(404).json({ success: false, message: "Client not found" });

    res.status(200).json({ success: true, message: "Client access updated successfully", client: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating client access", error: error.message });
  }
};

// ADMIN: delete client access
export const deleteClientAccess = async (req, res) => {
  try {
    const deleted = await ClientAccess.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Client not found" });
    res.status(200).json({ success: true, message: "Client access deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting client access", error: error.message });
  }
};

// PUBLIC: resolve a slug into client + assigned tours (used by the unlisted access page)
export const getClientAccessBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const client = await ClientAccess.findOne({ slug: slug.toLowerCase() }).populate(
      "assignedTours",
      "tourName tourURL thumbImage urlName area propertyLocation"
    );

    if (!client) {
      return res.status(404).json({ success: false, message: "This link is invalid or has expired" });
    }

    if (!client.isActive) {
      return res.status(403).json({ success: false, message: "This link is no longer active" });
    }

    if (client.expiresAt && new Date(client.expiresAt) < new Date()) {
      return res.status(403).json({ success: false, message: "This link has expired" });
    }

    res.status(200).json({
      success: true,
      clientName: client.clientName,
      tours: client.assignedTours,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error validating access link", error: error.message });
  }
};
