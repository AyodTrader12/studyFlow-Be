"use strict";
// server/src/routes/analytics.ts
// GET /api/admin/analytics
// Returns aggregated data for every chart in the admin analytics page:
// - signups per day (last 30 days)
// - resources viewed per day (last 30 days)
// - resources by subject (pie chart)
// - resources by type (bar chart)
// - top 10 most viewed resources
// - user class level distribution
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Auth_1 = require("../middleware/Auth");
const isAdmin_1 = require("../middleware/isAdmin");
const user_1 = __importDefault(require("../models/user"));
const Resource_1 = __importDefault(require("../models/Resource"));
const Progress_1 = __importDefault(require("../models/Progress"));
const router = (0, express_1.Router)();
router.use(Auth_1.protect, isAdmin_1.isAdmin);
router.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        // Run all aggregations in parallel for speed
        const [signupsPerDay, viewsPerDay, resourcesBySubject, resourcesByType, topResources, classDistribution, subjectEngagement, recentSignups,] = yield Promise.all([
            // 1. New user signups per day — last 30 days
            user_1.default.aggregate([
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
            Progress_1.default.aggregate([
                { $match: { completedAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                        count: { $sum: 1 },
                        timeSpent: { $sum: "$timeSpent" },
                    },
                },
                { $sort: { _id: 1 } },
                { $project: { date: "$_id", count: 1, timeSpent: 1, _id: 0 } },
            ]),
            // 3. Resources by subject — for pie chart
            Resource_1.default.aggregate([
                { $match: { isPublished: true } },
                { $group: { _id: "$subject", count: { $sum: 1 }, views: { $sum: "$views" } } },
                { $sort: { count: -1 } },
                { $project: { subject: "$_id", count: 1, views: 1, _id: 0 } },
            ]),
            // 4. Resources by type — for bar chart
            Resource_1.default.aggregate([
                { $match: { isPublished: true } },
                { $group: { _id: "$type", count: { $sum: 1 }, views: { $sum: "$views" } } },
                { $sort: { count: -1 } },
                { $project: { type: "$_id", count: 1, views: 1, _id: 0 } },
            ]),
            // 5. Top 10 most viewed resources
            Resource_1.default.find({ isPublished: true })
                .sort({ views: -1 })
                .limit(10)
                .select("title subject type level views bookmarks"),
            // 6. User class level distribution
            user_1.default.aggregate([
                { $match: { isVerified: true, classLevel: { $ne: "" } } },
                { $group: { _id: "$classLevel", count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
                { $project: { level: "$_id", count: 1, _id: 0 } },
            ]),
            // 7. Subject engagement — which subjects students study most
            Progress_1.default.aggregate([
                { $match: { completedAt: { $gte: sevenDaysAgo } } },
                {
                    $group: {
                        _id: "$subject",
                        views: { $sum: 1 },
                        timeSpent: { $sum: "$timeSpent" },
                    },
                },
                { $sort: { views: -1 } },
                { $limit: 8 },
                { $project: { subject: "$_id", views: 1, timeSpent: 1, _id: 0 } },
            ]),
            // 8. Recent signups (last 7 days count)
            user_1.default.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        ]);
        // Fill gaps in daily data so charts show continuous lines
        const filledSignups = fillDailyGaps(signupsPerDay, 30);
        const filledViews = fillDailyGaps(viewsPerDay, 30);
        res.json({
            signupsPerDay: filledSignups,
            viewsPerDay: filledViews,
            resourcesBySubject,
            resourcesByType,
            topResources,
            classDistribution,
            subjectEngagement,
            recentSignups,
        });
    }
    catch (error) {
        console.error("Analytics error:", error.message);
        res.status(500).json({ message: "Failed to fetch analytics." });
    }
}));
// Fill missing days with count: 0 so charts don't have gaps
function fillDailyGaps(data, days) {
    var _a;
    const map = new Map(data.map((d) => [d.date, d.count]));
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const date = d.toISOString().slice(0, 10);
        result.push({ date, count: (_a = map.get(date)) !== null && _a !== void 0 ? _a : 0 });
    }
    return result;
}
exports.default = router;
