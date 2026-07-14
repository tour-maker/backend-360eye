import JSZip from "jszip";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import mkdirp from "mkdirp";
import Image from "../models/Image.js"; // Make sure this is correct!

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export const handleZipUpload = async (req, res) => {
  try {
    
    const { albumId } = req.body;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!albumId) return res.status(400).json({ message: "No album selected" });

    const zip = await JSZip.loadAsync(req.file.buffer);
    const imageEntries = Object.values(zip.files).filter(
      file => !file.dir && /\.(jpg|jpeg|png)$/i.test(file.name)
    );

    const albumFolder = `${albumId}_${Date.now()}`;
    const albumUploadPath = path.join(__dirname, "../../uploads/albums", albumFolder);
    await mkdirp(albumUploadPath);

    const results = [];

    for (const file of imageEntries) {
      const imageBuffer = await file.async("nodebuffer");
      const baseName = path.parse(file.name).name;
      const filenameBase = `${uuidv4()}-${baseName}.jpg`;

      // Define paths
      const thumbPath = path.join(albumUploadPath, `thumb_${filenameBase}`);
      const desktopPath = path.join(albumUploadPath, `desktop_${filenameBase}`);
      const tabletPath = path.join(albumUploadPath, `tablet_${filenameBase}`);
      const mobilePath = path.join(albumUploadPath, `mobile_${filenameBase}`);

      // Perform resizing and compression
      await sharp(imageBuffer).resize(200, 200).jpeg({ quality: 60 }).toFile(thumbPath);
      await sharp(imageBuffer).resize(1920).jpeg({ quality: 80 }).toFile(desktopPath);
      await sharp(imageBuffer).resize(1280).jpeg({ quality: 80 }).toFile(tabletPath);
      await sharp(imageBuffer).resize(768).jpeg({ quality: 80 }).toFile(mobilePath);

      // Save to DB
      const newImage = new Image({
        albumName: albumId,
        imageStatus: "Yes",
        imageOrder: 360, // or you can increment dynamically
        thumbPhoto: `/uploads/albums/${albumFolder}/thumb_${filenameBase}`,
        desktopPhoto: `/uploads/albums/${albumFolder}/desktop_${filenameBase}`,
        tabletPhoto: `/uploads/albums/${albumFolder}/tablet_${filenameBase}`,
        mobilePhoto: `/uploads/albums/${albumFolder}/mobile_${filenameBase}`,
        imageDescription: "",
      });

      await newImage.save();
      results.push(newImage);
    }

    res.status(200).json({
      message: "Upload and image processing successful!",
      images: results,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to process zip", error: err.message });
  }
};
