import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { env } from "./env.js";

// Configure the SDK
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use RAM (MemoryStorage) instead of disk
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export { cloudinary };