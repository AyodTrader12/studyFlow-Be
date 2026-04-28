"use strict";
// server/src/routes/admin.ts
// Admin-only API endpoints.
// GET /api/admin/stats        — platform-wide stats for overview page
// GET /api/admin/users        — list all users with optional search/filter
// GET /api/admin/youtube-preview — YouTube metadata fetch for admin panel
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
const PastQuestionModel_1 = __importDefault(require("../models/PastQuestionModel"));
const YoutubeService_1 = require("../services/YoutubeService");
const router = (0, express_1.Router)();
// All admin routes require both protect + isAdmin
router.use(Auth_1.protect, isAdmin_1.isAdmin);
// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const [totalUsers, verifiedUsers, totalResources, publishedResources, totalPastQuestions, totalViewsResult,] = yield Promise.all([
            user_1.default.countDocuments(),
            user_1.default.countDocuments({ isVerified: true }),
            Resource_1.default.countDocuments(),
            Resource_1.default.countDocuments({ isPublished: true }),
            PastQuestionModel_1.default.countDocuments({ isPublished: true }),
            Resource_1.default.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
        ]);
        res.json({
            totalUsers,
            verifiedUsers,
            totalResources,
            publishedResources,
            totalPastQuestions,
            totalViews: (_b = (_a = totalViewsResult[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0,
        });
    }
    catch (_c) {
        res.status(500).json({ message: "Failed to fetch stats." });
    }
}));
// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, filter, limit = "50", sort = "newest" } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { displayName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }
        if (filter === "verified")
            query.isVerified = true;
        if (filter === "unverified")
            query.isVerified = false;
        if (filter === "admin")
            query.isAdmin = true;
        const sortOrder = sort === "newest" ? { createdAt: -1 } : { displayName: 1 };
        const users = yield user_1.default.find(query)
            .sort(sortOrder)
            .limit(parseInt(limit))
            .select("-passwordHash -otp"); // never send password hash or OTP to frontend
        res.json({ users });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch users." });
    }
}));
// ── GET /api/admin/youtube-preview ───────────────────────────────────────────
router.get("/youtube-preview", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = req.query.url;
        if (!url) {
            res.status(400).json({ message: "URL is required." });
            return;
        }
        console.log("YouTube preview request for:", url);
        console.log("YOUTUBE_API_KEY set:", process.env.YOUTUBE_API_KEY ? `YES (${process.env.YOUTUBE_API_KEY.slice(0, 8)}...)` : "NO ← THIS IS THE PROBLEM");
        const metadata = yield (0, YoutubeService_1.fetchYouTubeMetadata)(url);
        res.json(metadata);
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Could not fetch YouTube details." });
    }
}));
exports.default = router;
