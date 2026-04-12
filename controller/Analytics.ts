// server/src/routes/analytics.ts
// GET /api/admin/analytics
// Returns aggregated data for every chart in the admin analytics page:
// - signups per day (last 30 days)
// - resources viewed per day (last 30 days)
// - resources by subject (pie chart)
// - resources by type (bar chart)
// - top 10 most viewed resources
// - user class level distribution

import { Router, Response } from "express";
import { protect }   from "../middleware/Auth";
import { isAdmin }   from "../middleware/isAdmin";
import User          from "../models/user";
import Resource      from "../models/Resource";
import Progress      from "../models/Progress";
import type { AuthRequest } from "../types/Auth";

const router = Router();
router.use(protect, isAdmin);

router.get("/", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000);

    // Run all aggregations in parallel for speed
    const [
      signupsPerDay,
      viewsPerDay,
      resourcesBySubject,
      resourcesByType,
      topResources,
      classDistribution,
      subjectEngagement,
      recentSignups,
    ] = await Promise.all([

      // 1. New user signups per day — last 30 days
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", count: 1, _id: 0 } },
      ]),

      // 2. Resource views per day — last 30 days
      Progress.aggregate([
        { $match: { completedAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            count:     { $sum: 1 },
            timeSpent: { $sum: "$timeSpent" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", count: 1, timeSpent: 1, _id: 0 } },
      ]),

      // 3. Resources by subject — for pie chart
      Resource.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: "$subject", count: { $sum: 1 }, views: { $sum: "$views" } } },
        { $sort: { count: -1 } },
        { $project: { subject: "$_id", count: 1, views: 1, _id: 0 } },
      ]),

      // 4. Resources by type — for bar chart
      Resource.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: "$type", count: { $sum: 1 }, views: { $sum: "$views" } } },
        { $sort: { count: -1 } },
        { $project: { type: "$_id", count: 1, views: 1, _id: 0 } },
      ]),

      // 5. Top 10 most viewed resources
      Resource.find({ isPublished: true })
        .sort({ views: -1 })
        .limit(10)
        .select("title subject type level views bookmarks"),

      // 6. User class level distribution
      User.aggregate([
        { $match: { isVerified: true, classLevel: { $ne: "" } } },
        { $group: { _id: "$classLevel", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { level: "$_id", count: 1, _id: 0 } },
      ]),

      // 7. Subject engagement — which subjects students study most
      Progress.aggregate([
        { $match: { completedAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id:       "$subject",
            views:     { $sum: 1 },
            timeSpent: { $sum: "$timeSpent" },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 8 },
        { $project: { subject: "$_id", views: 1, timeSpent: 1, _id: 0 } },
      ]),

      // 8. Recent signups (last 7 days count)
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    // Fill gaps in daily data so charts show continuous lines
    const filledSignups = fillDailyGaps(signupsPerDay, 30);
    const filledViews   = fillDailyGaps(viewsPerDay,   30);

    res.json({
      signupsPerDay:      filledSignups,
      viewsPerDay:        filledViews,
      resourcesBySubject,
      resourcesByType,
      topResources,
      classDistribution,
      subjectEngagement,
      recentSignups,
    });
  } catch (error) {
    console.error("Analytics error:", (error as Error).message);
    res.status(500).json({ message: "Failed to fetch analytics." });
  }
});

// Fill missing days with count: 0 so charts don't have gaps
function fillDailyGaps(
  data: { date: string; count: number }[],
  days: number
): { date: string; count: number }[] {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const d    = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const date = d.toISOString().slice(0, 10);
    result.push({ date, count: map.get(date) ?? 0 });
  }

  return result;
}

export default router;