// Auth for the Google Sheets automation integration.
// Not a user login — a fixed shared secret sent by the Apps Script on every request.
const requireAutomationKey = (req, res, next) => {
  const key = req.headers["x-automation-key"];
  if (!key || key !== process.env.AUTOMATION_API_KEY) {
    return res.status(401).json({ success: false, message: "Invalid or missing automation key" });
  }
  next();
};

export default requireAutomationKey;
