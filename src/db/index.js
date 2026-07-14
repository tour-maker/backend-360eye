import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const connectDB = async () => {
  try {
    const mongoUri = process.env.DATABASE_URL || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error(
        'MongoDB connection string is missing. Please set DATABASE_URL or MONGODB_URI in your .env file'
      );
    }
    
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB Connected successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
};

export default connectDB;
