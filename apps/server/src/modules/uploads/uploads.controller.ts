import type { Request, Response } from "express";
import { cloudinary } from "../../shared/config/cloudinary.config.js";

export const uploadImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided"});
        }

        const streamUpload = (fileBuffer: Buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "phatter_posts" },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(fileBuffer);
            });
        };

        const result = await streamUpload(req.file.buffer) as any;

        res.status(201).json({
            status: "success",
            imageUrl: result.secure_url,
        });
    } catch (error) {
        console.error("Image Upload Error:", error);
        res.status(500).json({ error: "Failed to upload image" });
    }
};