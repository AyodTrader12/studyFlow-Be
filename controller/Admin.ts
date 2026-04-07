// src/routes/admin.ts
// Admin-only routes.
// GET /api/admin/youtube-preview?url=... — fetches YouTube metadata for admin panel preview

import { Router, Response } from "express";
import { protect } from "../middleware/Auth";
import { isAdmin } from "../middleware/isAdmin";
import { fetchYouTubeMetadata } from "../services/YoutubeService";
import type { AuthRequest } from "../types/index.js";

const router = Router();

// GET /api/admin/youtube-preview
// Called by the admin panel when a YouTube URL is pasted.
// Returns video title, thumbnail, duration, channelTitle for preview.
router.get(
  "/youtube-preview",
  protect,
  isAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const url = req.query.url as string;
      if (!url) {
        res.status(400).json({ message: "URL is required." });
        return;
      }

      const metadata = await fetchYouTubeMetadata(url);
      res.json(metadata);
    } catch (error) {
      res.status(400).json({
        message: (error as Error).message || "Could not fetch YouTube details.",
      });
    }
  }
);

export default router;