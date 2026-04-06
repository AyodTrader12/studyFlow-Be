"use strict";
// // src/routes/progress.ts
// import { Router, Response } from "express";
// import { protect } from "../middleware/Auth";
// import Progress from "../models/Progress";
// import Resource from "../models/Resource";
// import { sendStreakMilestoneEmail } from "../services/EmailService";
// import type { AuthRequest } from "../types/index";
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
// const router = Router();
// const MILESTONES = [7, 14, 30, 60, 100];
// router.get("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const progress = await Progress.find({ userId: req.user!._id }).populate({ path: "resourceId", select: "-content" }).sort({ completedAt: -1 });
//     res.json({ progress });
//   } catch { res.status(500).json({ message: "Failed to fetch progress." }); }
// });
// router.get("/stats", protect, async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const stats = await Progress.aggregate([
//       { $match: { userId: req.user!._id } },
//       { $group: { _id: "$subject", count: { $sum: 1 }, lastViewed: { $max: "$completedAt" } } },
//       { $sort: { count: -1 } },
//     ]);
//     res.json({ stats });
//   } catch { res.status(500).json({ message: "Failed to fetch progress stats." }); }
// });
// router.post("/:resourceId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const { timeSpent } = req.body as { timeSpent?: number };
//     const resource = await Resource.findById(req.params.resourceId);
//     if (!resource) { res.status(404).json({ message: "Resource not found." }); return; }
//     await Progress.findOneAndUpdate(
//       { userId: req.user!._id, resourceId: req.params.resourceId },
//       { subject: resource.subject, level: resource.level, completedAt: new Date(), timeSpent: timeSpent ?? 0 },
//       { upsert: true, new: true }
//     );
//     const user = req.user!;
//     user.totalResourcesViewed += 1;
//     const today = new Date().toDateString();
//     const lastDate = user.streak.lastStudied?.toDateString();
//     if (lastDate !== today) {
//       const yesterday = new Date(Date.now() - 86_400_000).toDateString();
//       user.streak.current = lastDate === yesterday ? user.streak.current + 1 : 1;
//       if (user.streak.current > user.streak.longest) user.streak.longest = user.streak.current;
//       user.streak.lastStudied = new Date();
//       if (MILESTONES.includes(user.streak.current) && user.emailPreferences.streakMilestones) {
//         sendStreakMilestoneEmail({ to: user.email, name: user.displayName, streak: user.streak.current }).catch(console.error);
//       }
//     }
//     await user.save();
//     res.status(201).json({ message: "Progress recorded.", streak: user.streak.current });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to record progress." });
//   }
// });
// export default router;
// src/routes/progress.ts
const Auth_1 = require("../middleware/Auth");
const Progress_1 = __importDefault(require("../models/Progress"));
const Resource_1 = __importDefault(require("../models/Resource"));
const EmailService_1 = require("../services/EmailService");
const express_1 = require("express");
const router = (0, express_1.Router)();
const MILESTONES = [7, 14, 30, 60, 100];
// GET /api/progress — full list of viewed resources
router.get("/", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const progress = yield Progress_1.default.find({ userId: req.user._id })
            .populate({
            path: "resourceId",
            select: "_id title subject topic type level thumbnail duration",
        })
            .sort({ completedAt: -1 })
            .limit(100);
        res.json({ progress });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch progress." });
    }
}));
// GET /api/progress/stats — aggregated per-subject stats
router.get("/stats", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield Progress_1.default.aggregate([
            { $match: { userId: req.user._id } },
            {
                $group: {
                    _id: "$subject",
                    count: { $sum: 1 },
                    lastViewed: { $max: "$completedAt" },
                    totalTime: { $sum: "$timeSpent" },
                },
            },
            { $sort: { count: -1 } },
        ]);
        res.json({ stats });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch progress stats." });
    }
}));
// POST /api/progress/:resourceId — mark a resource as viewed
router.post("/:resourceId", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { timeSpent } = req.body;
        const resource = yield Resource_1.default.findById(req.params.resourceId);
        if (!resource) {
            res.status(404).json({ message: "Resource not found." });
            return;
        }
        // Upsert — if already viewed, update completedAt and timeSpent
        yield Progress_1.default.findOneAndUpdate({ userId: req.user._id, resourceId: req.params.resourceId }, {
            subject: resource.subject,
            level: resource.level,
            completedAt: new Date(),
            timeSpent: timeSpent !== null && timeSpent !== void 0 ? timeSpent : 0,
        }, { upsert: true, new: true });
        const user = req.user;
        // Only increment total viewed on first view (not re-views)
        const viewCount = yield Progress_1.default.countDocuments({
            userId: user._id,
            resourceId: req.params.resourceId,
        });
        if (viewCount === 1) {
            user.totalResourcesViewed += 1;
        }
        // Update streak
        const today = new Date().toDateString();
        const lastDate = (_a = user.streak.lastStudied) === null || _a === void 0 ? void 0 : _a.toDateString();
        if (lastDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            user.streak.current = lastDate === yesterday ? user.streak.current + 1 : 1;
            if (user.streak.current > user.streak.longest) {
                user.streak.longest = user.streak.current;
            }
            user.streak.lastStudied = new Date();
            // Fire milestone emails at streak checkpoints
            if (MILESTONES.includes(user.streak.current) &&
                user.emailPreferences.streakMilestones) {
                (0, EmailService_1.sendStreakMilestoneEmail)({
                    to: user.email,
                    name: user.displayName,
                    streak: user.streak.current,
                }).catch(console.error);
            }
        }
        yield user.save();
        res.status(201).json({
            message: "Progress recorded.",
            streak: user.streak.current,
            longest: user.streak.longest,
        });
    }
    catch (error) {
        console.error("Progress error:", error);
        res.status(500).json({ message: "Failed to record progress." });
    }
}));
exports.default = router;
