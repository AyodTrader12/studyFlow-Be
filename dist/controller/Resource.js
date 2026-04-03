"use strict";
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
// src/routes/resources.ts
const express_1 = require("express");
const Auth_js_1 = require("../middleware/Auth.js");
const isAdmin_js_1 = require("../middleware/isAdmin.js");
const Resource_js_1 = __importDefault(require("../models/Resource.js"));
const YoutubeService_js_1 = require("../services/YoutubeService.js");
const router = (0, express_1.Router)();
router.get("/", Auth_js_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subject, level, type, search, page = "1", limit = "20" } = req.query;
        const filter = { isPublished: true };
        if (subject && subject !== "All Subjects")
            filter.subject = subject;
        if (level && level !== "All Levels")
            filter.level = level;
        if (type && type !== "All Types")
            filter.type = type;
        if (search)
            filter.$text = { $search: search };
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = yield Resource_js_1.default.countDocuments(filter);
        const resources = yield Resource_js_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select("-content");
        res.json({ resources, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), hasMore: skip + resources.length < total } });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch resources." });
    }
}));
router.get("/:id", Auth_js_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const resource = yield Resource_js_1.default.findById(req.params.id);
        if (!resource) {
            res.status(404).json({ message: "Resource not found." });
            return;
        }
        resource.views += 1;
        yield resource.save();
        res.json({ resource });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch resource." });
    }
}));
router.post("/", Auth_js_1.protect, isAdmin_js_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        if (data.type === "youtube" && data.url) {
            try {
                const ytData = yield (0, YoutubeService_js_1.fetchYouTubeMetadata)(data.url);
                if (!data.title)
                    data.title = ytData.title;
                if (!data.thumbnail)
                    data.thumbnail = ytData.thumbnail;
                if (!data.duration)
                    data.duration = ytData.duration;
                data.youtubeData = { videoId: ytData.videoId, channelTitle: ytData.channelTitle, viewCount: ytData.viewCount };
            }
            catch (ytError) {
                console.warn("YouTube fetch failed:", ytError.message);
            }
        }
        const resource = yield Resource_js_1.default.create(Object.assign(Object.assign({}, data), { addedBy: req.user.firebaseUid }));
        res.status(201).json({ message: "Resource created.", resource });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to create resource." });
    }
}));
router.patch("/:id", Auth_js_1.protect, isAdmin_js_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const resource = yield Resource_js_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!resource) {
            res.status(404).json({ message: "Resource not found." });
            return;
        }
        res.json({ message: "Resource updated.", resource });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to update resource." });
    }
}));
router.delete("/:id", Auth_js_1.protect, isAdmin_js_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield Resource_js_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Resource deleted." });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to delete resource." });
    }
}));
exports.default = router;
