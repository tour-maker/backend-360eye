import Redirect from "../models/redirectURLModel.js";

// Public endpoint to check if a URL has a redirect (no auth required)
export const checkRedirect = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL parameter is required",
      });
    }

    const redirect = await Redirect.findOne({ oldUrl: url });

    if (redirect) {
      return res.status(200).json({
        success: true,
        hasRedirect: true,
        newUrl: redirect.newUrl,
      });
    }

    res.status(200).json({
      success: true,
      hasRedirect: false,
    });
  } catch (error) {
    console.error("Error checking redirect:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check redirect",
    });
  }
};

export const handleRedirect = async (req, res, next) => {
  try {
    const requestUrl = req.originalUrl;
    const reverseRedirect = await Redirect.findOne({ newUrl: requestUrl });

    if (reverseRedirect) {
      req.originalRequestUrl = requestUrl;
      req.url = reverseRedirect.oldUrl;
      return next();
    }
    const redirect = await Redirect.findOne({ oldUrl: requestUrl });

    if (redirect) {
      return res.redirect(301, redirect.newUrl);
    }
    next();
  } catch (error) {
    console.error("Error handling redirect:", error);
    next(error);
  }
};

// Get all redirects with pagination and search
export const getAllRedirects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    // Create search filter
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { oldUrl: { $regex: search, $options: "i" } },
          { newUrl: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Get total count
    const totalCount = await Redirect.countDocuments(filter);

    // Get paginated results
    const redirects = await Redirect.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      redirects,
      pagination: {
        total: totalCount,
        page,
        pages: Math.ceil(totalCount / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching redirects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch redirects",
    });
  }
};

// Add a new redirect
export const createRedirect = async (req, res) => {
  try {
    const { oldUrl, newUrl } = req.body;

    if (!oldUrl || !newUrl) {
      return res.status(400).json({
        success: false,
        message: "Both old URL and new URL are required",
      });
    }

    // Check if old URL already exists
    const existingRedirect = await Redirect.findOne({ oldUrl });

    if (existingRedirect) {
      return res.status(400).json({
        success: false,
        message: "A redirect for this URL already exists",
      });
    }

    // Create new redirect
    const redirect = await Redirect.create({
      oldUrl,
      newUrl,
    });

    res.status(201).json({
      success: true,
      redirect,
      message: "Redirect created successfully",
    });
  } catch (error) {
    console.error("Error creating redirect:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create redirect",
    });
  }
};

// Update an existing redirect
export const updateRedirectById = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldUrl, newUrl } = req.body;

    if (!oldUrl || !newUrl) {
      return res.status(400).json({
        success: false,
        message: "Both old URL and new URL are required",
      });
    }

    // Check if redirect exists
    const redirect = await Redirect.findById(id);

    if (!redirect) {
      return res.status(404).json({
        success: false,
        message: "Redirect not found",
      });
    }

    // Check if updated oldUrl conflicts with another redirect (but not itself)
    if (oldUrl !== redirect.oldUrl) {
      const existingRedirect = await Redirect.findOne({
        oldUrl,
        _id: { $ne: id },
      });

      if (existingRedirect) {
        return res.status(400).json({
          success: false,
          message: "Another redirect with this old URL already exists",
        });
      }
    }

    // Update redirect
    redirect.oldUrl = oldUrl;
    redirect.newUrl = newUrl;
    await redirect.save();

    res.status(200).json({
      success: true,
      redirect,
      message: "Redirect updated successfully",
    });
  } catch (error) {
    console.error("Error updating redirect:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update redirect",
    });
  }
};

// Delete a redirect
export const deleteRedirectById = async (req, res) => {
  try {
    const { id } = req.params;

    const redirect = await Redirect.findById(id);

    if (!redirect) {
      return res.status(404).json({
        success: false,
        message: "Redirect not found",
      });
    }

    await Redirect.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Redirect deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting redirect:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete redirect",
    });
  }
};
