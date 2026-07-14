import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";
import { initDomainReminderScheduler } from "./services/domainReminderService.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5001;

// Start Server
const startServer = async () => {
  await connectDB();
  // Create server with increased timeout
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

    const enableDomainReminder =
      process.env.ENABLE_DOMAIN_REMINDER == null || process.env.ENABLE_DOMAIN_REMINDER !== "false";

    if (enableDomainReminder) {
      try {
        initDomainReminderScheduler();
      } catch (error) {
        console.error("Failed to start domain reminder scheduler", error);
      }
    } else {
      console.info("Domain reminder scheduler is disabled via ENABLE_DOMAIN_REMINDER env flag");
    }
  });
  
  // Set timeout to 30 minutes for large file uploads
  server.timeout = 30 * 60 * 1000;
  server.keepAliveTimeout = 30 * 60 * 1000;
  server.headersTimeout = 31 * 60 * 1000; // slightly larger than keepAliveTimeout
};

startServer();
