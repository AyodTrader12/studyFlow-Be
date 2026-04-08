// src/routes/resources.ts
import { Router, Response } from "express";
import { protect } from "../middleware/Auth";
import { isAdmin } from "../middleware/isAdmin";
import Resource from "../models/Resource";

import type { AuthRequest, ResourceQueryParams } from "../types/index";
import { fetchYouTubeMetadata } from "../services/YoutubeService";

const router = Router();

// GET /api/resources/subject-counts
// Returns { counts: [{ _id: "Mathematics", count: 12, levels: ["SS1","SS2"] }] }
router.get("/subject-counts", protect, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const counts = await Resource.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id:    "$subject",
          count:  { $sum: 1 },
          levels: { $addToSet: "$level" },
          types:  { $addToSet: "$type" },
        },
      },
      { $sort: { count: -1 } },
    ]);
    res.json({ counts });
  } catch {
    res.status(500).json({ message: "Failed to fetch subject counts." });
  }
});
 
router.get("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, level, type, search, page = "1", limit = "20" } = req.query as ResourceQueryParams;
    const filter: Record<string, unknown> = { isPublished: true };
    if (subject && subject !== "All Subjects") filter.subject = subject;
    if (level   && level   !== "All Levels")   filter.level   = level;
    if (type    && type    !== "All Types")     filter.type    = type;
    if (search) filter.$text = { $search: search };
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Resource.countDocuments(filter);
    const resources = await Resource.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select("-content");
    res.json({ resources, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), hasMore: skip + resources.length < total } });
  } catch { res.status(500).json({ message: "Failed to fetch resources." }); }
});

router.get("/:id", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) { res.status(404).json({ message: "Resource not found." }); return; }
    resource.views += 1;
    await resource.save();
    res.json({ resource });
  } catch { res.status(500).json({ message: "Failed to fetch resource." }); }
});

router.post("/", protect, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body as Record<string, unknown>;
    if (data.type === "youtube" && data.url) {
      try {
        const ytData = await fetchYouTubeMetadata(data.url as string);
        if (!data.title)     data.title     = ytData.title;
        if (!data.thumbnail) data.thumbnail = ytData.thumbnail;
        if (!data.duration)  data.duration  = ytData.duration;
        data.youtubeData = { videoId: ytData.videoId, channelTitle: ytData.channelTitle, viewCount: ytData.viewCount };
      } catch (ytError) { console.warn("YouTube fetch failed:", (ytError as Error).message); }
    }
    const resource = await Resource.create({ ...data, addedBy: req.user!.firebaseUid });
    res.status(201).json({ message: "Resource created.", resource });
  } catch { res.status(500).json({ message: "Failed to create resource." }); }
});

router.patch("/:id", protect, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!resource) { res.status(404).json({ message: "Resource not found." }); return; }
    res.json({ message: "Resource updated.", resource });
  } catch { res.status(500).json({ message: "Failed to update resource." }); }
});

router.delete("/:id", protect, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: "Resource deleted." });
  } catch { res.status(500).json({ message: "Failed to delete resource." }); }
});

export default router;