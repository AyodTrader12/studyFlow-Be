// server/src/routes/admin.ts
// Admin-only API endpoints.
// GET /api/admin/stats        — platform-wide stats for overview page
// GET /api/admin/users        — list all users with optional search/filter
// GET /api/admin/youtube-preview — YouTube metadata fetch for admin panel

import { Router, Response } from "express";
import { protect }  from "../middleware/Auth";
import { isAdmin }  from "../middleware/isAdmin";
import User         from "../models/user";
import Resource     from "../models/Resource";
import PastQuestion from "../models/PastQuestionModel";
import Progress     from "../models/Progress";
import { fetchYouTubeMetadata } from "../services/YoutubeService";
import type { AuthRequest } from "../types/index";

const router = Router();

// All admin routes require both protect + isAdmin
router.use(protect, isAdmin);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      totalResources,
      publishedResources,
      totalPastQuestions,
      totalViewsResult,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      Resource.countDocuments(),
      Resource.countDocuments({ isPublished: true }),
      PastQuestion.countDocuments({ isPublished: true }),
      Resource.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
    ]);

    res.json({
      totalUsers,
      verifiedUsers,
      totalResources,
      publishedResources,
      totalPastQuestions,
      totalViews: totalViewsResult[0]?.total ?? 0,
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch stats." });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, filter, limit = "50", sort = "newest" } = req.query as {
      search?: string;
      filter?: string;
      limit?:  string;
      sort?:   string;
    };

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { email:       { $regex: search, $options: "i" } },
      ];
    }

    if (filter === "verified")   query.isVerified = true;
    if (filter === "unverified") query.isVerified = false;
    if (filter === "admin")      query.isAdmin    = true;

    const sortOrder: Record<string, 1 | -1> = sort === "newest" ? { createdAt: -1 } : { displayName: 1 };

    const users = await User.find(query)
      .sort(sortOrder)
      .limit(parseInt(limit))
      .select("-passwordHash -otp"); // never send password hash or OTP to frontend

    res.json({ users });
  } catch {
    res.status(500).json({ message: "Failed to fetch users." });
  }
});

// ── GET /api/admin/youtube-preview ───────────────────────────────────────────
router.get("/youtube-preview", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const url = req.query.url as string;
    if (!url) { res.status(400).json({ message: "URL is required." }); return; }
     console.log("YouTube preview request for:", url);
    console.log("YOUTUBE_API_KEY set:", process.env.YOUTUBE_API_KEY ? `YES (${process.env.YOUTUBE_API_KEY.slice(0, 8)}...)` : "NO ← THIS IS THE PROBLEM");
 
    const metadata = await fetchYouTubeMetadata(url);
    res.json(metadata);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message || "Could not fetch YouTube details." });

  }
});

export default router;