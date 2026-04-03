// src/routes/progress.ts
import { Router, Response } from "express";
import { protect } from "../middleware/Auth.js";
import Progress from "../models/Progress.js";
import Resource from "../models/Resource.js";
import { sendStreakMilestoneEmail } from "../services/EmailService.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();
const MILESTONES = [7, 14, 30, 60, 100];

router.get("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const progress = await Progress.find({ userId: req.user!._id }).populate({ path: "resourceId", select: "-content" }).sort({ completedAt: -1 });
    res.json({ progress });
  } catch { res.status(500).json({ message: "Failed to fetch progress." }); }
});

router.get("/stats", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await Progress.aggregate([
      { $match: { userId: req.user!._id } },
      { $group: { _id: "$subject", count: { $sum: 1 }, lastViewed: { $max: "$completedAt" } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ stats });
  } catch { res.status(500).json({ message: "Failed to fetch progress stats." }); }
});

router.post("/:resourceId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { timeSpent } = req.body as { timeSpent?: number };
    const resource = await Resource.findById(req.params.resourceId);
    if (!resource) { res.status(404).json({ message: "Resource not found." }); return; }

    await Progress.findOneAndUpdate(
      { userId: req.user!._id, resourceId: req.params.resourceId },
      { subject: resource.subject, level: resource.level, completedAt: new Date(), timeSpent: timeSpent ?? 0 },
      { upsert: true, new: true }
    );

    const user = req.user!;
    user.totalResourcesViewed += 1;
    const today = new Date().toDateString();
    const lastDate = user.streak.lastStudied?.toDateString();

    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86_400_000).toDateString();
      user.streak.current = lastDate === yesterday ? user.streak.current + 1 : 1;
      if (user.streak.current > user.streak.longest) user.streak.longest = user.streak.current;
      user.streak.lastStudied = new Date();

      if (MILESTONES.includes(user.streak.current) && user.emailPreferences.streakMilestones) {
        sendStreakMilestoneEmail({ to: user.email, name: user.displayName, streak: user.streak.current }).catch(console.error);
      }
    }

    await user.save();
    res.status(201).json({ message: "Progress recorded.", streak: user.streak.current });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to record progress." });
  }
});

export default router;