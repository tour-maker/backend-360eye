import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../src/db/index.js";
import Product from "../src/models/productModel.js";

dotenv.config({ path: "./.env" });

const rawQuery = process.argv[2];

if (!rawQuery) {
  console.error("Usage: node scripts/checkTourPassword.js <tour-slug-or-url-fragment>");
  process.exit(1);
}

const normalizeFragment = (value) => {
  return value
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^gallery\/(3d\/)?/, "")
    .replace(/\/index\.html$/, "")
    .trim();
};

const fragment = normalizeFragment(rawQuery);

const buildRegex = (fragmentValue) => {
  const escaped = fragmentValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}$`, "i");
};

const main = async () => {
  try {
    await connectDB();

    const regex = buildRegex(fragment);

    const products = await Product.find({
      tourURL: { $regex: regex },
    })
      .select("tourName tourURL tourPasswordEnabled tourPasswordUpdatedAt")
      .lean();

    if (!products.length) {
      console.log(`No tour found matching fragment: ${fragment}`);
      return;
    }

    products.forEach((product) => {
      const status = product.tourPasswordEnabled ? "ENABLED" : "DISABLED";
      console.log(`\nTour: ${product.tourName}`);
      console.log(`URL: ${product.tourURL}`);
      console.log(`Password: ${status}`);
      if (product.tourPasswordUpdatedAt) {
        console.log(`Last Updated: ${new Date(product.tourPasswordUpdatedAt).toISOString()}`);
      }
    });
  } catch (error) {
    console.error("Failed to check tour password:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

main();
