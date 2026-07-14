import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import AllowedDomain from "../models/allowedDomainModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const checkAndEnsureDomains = async () => {
  try {
    const mongoUri = process.env.DATABASE_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("DATABASE_URL not found");
    }
    
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // List all current domains
    const domains = await AllowedDomain.find({}).sort({ createdAt: -1 });
    console.log(`📋 Current domains in database: ${domains.length}\n`);
    
    domains.forEach((d, i) => {
      console.log(`${i + 1}. ${d.domainLabel || d.domain}`);
      console.log(`   Origin: ${d.origin}`);
      console.log(`   System: ${d.isSystemDomain ? "YES" : "NO"}`);
      console.log(`   Active: ${d.isActive ? "YES" : "NO"}\n`);
    });

    // Required domains for production
    const requiredDomains = [
      {
        domainLabel: "Production Root",
        origin: "https://360eye.in",
        isSystemDomain: true,
      },
      {
        domainLabel: "Production Website (www)",
        origin: "https://www.360eye.in",
        isSystemDomain: true,
      },
      {
        domainLabel: "Production Website",
        origin: "https://website.360eye.in",
        isSystemDomain: true,
      },
      {
        domainLabel: "Production API",
        origin: "https://api.360eye.in",
        isSystemDomain: true,
      },
      {
        domainLabel: "CloudFront CDN",
        origin: "https://dl8mwi3fl0yp4.cloudfront.net",
        isSystemDomain: true,
      },
      {
        domainLabel: "CloudFront CDN (legacy)",
        origin: "https://d2t6r6l6h3adka.cloudfront.net",
        isSystemDomain: true,
      },
      {
        domainLabel: "Admin Panel",
        origin: "https://adminpanel.360eye.in",
        isSystemDomain: true,
      },
    ];

    console.log("\n🔍 Checking required domains...\n");
    
    for (const reqDomain of requiredDomains) {
      const url = new URL(reqDomain.origin);
      const hostname = url.hostname;
      
      const existing = await AllowedDomain.findOne({ hostname });
      
      if (!existing) {
        console.log(`❌ Missing: ${reqDomain.domainLabel} (${reqDomain.origin})`);
        console.log(`   Creating...`);
        
        await AllowedDomain.create({
          domainLabel: reqDomain.domainLabel,
          domain: hostname,
          origin: reqDomain.origin,
          hostname: hostname,
          protocol: url.protocol,
          isSystemDomain: reqDomain.isSystemDomain,
          isActive: true,
        });
        
        console.log(`   ✅ Created\n`);
      } else {
        console.log(`✅ Found: ${reqDomain.domainLabel}`);
        if (!existing.isActive) {
          existing.isActive = true;
          await existing.save();
          console.log(`   ⚠️  Was inactive, now activated\n`);
        } else {
          console.log(`   Already active\n`);
        }
      }
    }

    console.log("\n✅ All required domains are now configured!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

checkAndEnsureDomains()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
