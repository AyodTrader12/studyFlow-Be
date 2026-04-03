// src/routes/bookmarks.ts
import { Router, Response } from "express";
import { protect } from "../middleware/Auth";
import Bookmark from "../models/Bookmark";
import Resource from "../models/Resource";
import user from "../models/user";
import type { AuthRequest } from "../types/index";

const router = Router();

router.get("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user!._id }).populate({ path: "resourceId", select: "-content" }).sort({ createdAt: -1 });
    res.json({ bookmarks: bookmarks.map((b) => b.resourceId).filter(Boolean) });
  } catch { res.status(500).json({ message: "Failed to fetch bookmarks." }); }
});

router.post("/:resourceId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await Bookmark.findOne({ userId: req.user!._id, resourceId: req.params.resourceId });
    if (existing) { res.status(400).json({ message: "Already bookmarked." }); return; }
    await Bookmark.create({ userId: req.user!._id, resourceId: String(req.params.resourceId) });
    await Resource.findByIdAndUpdate(req.params.resourceId, { $inc: { bookmarks: 1 } });
    await user.findByIdAndUpdate(req.user!._id, { $inc: { totalBookmarks: 1 } });
    res.status(201).json({ message: "Bookmarked successfully." });
  } catch { res.status(500).json({ message: "Failed to bookmark resource." }); }
});

router.delete("/:resourceId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleted = await Bookmark.findOneAndDelete({ userId: req.user!._id, resourceId: req.params.resourceId });
    if (!deleted) { res.status(404).json({ message: "Bookmark not found." }); return; }
    await Resource.findByIdAndUpdate(req.params.resourceId, { $inc: { bookmarks: -1 } });
    await user.findByIdAndUpdate(req.user!._id, { $inc: { totalBookmarks: -1 } });
    res.json({ message: "Bookmark removed." });
  } catch { res.status(500).json({ message: "Failed to remove bookmark." }); }
});

export default router;