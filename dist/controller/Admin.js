"use strict";
// src/routes/admin.ts
// Admin-only routes.
// GET /api/admin/youtube-preview?url=... — fetches YouTube metadata for admin panel preview
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Auth_1 = require("../middleware/Auth");
const isAdmin_1 = require("../middleware/isAdmin");
const YoutubeService_1 = require("../services/YoutubeService");
const router = (0, express_1.Router)();
// GET /api/admin/youtube-preview
// Called by the admin panel when a YouTube URL is pasted.
// Returns video title, thumbnail, duration, channelTitle for preview.
router.get("/youtube-preview", Auth_1.protect, isAdmin_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = req.query.url;
        if (!url) {
            res.status(400).json({ message: "URL is required." });
            return;
        }
        const metadata = yield (0, YoutubeService_1.fetchYouTubeMetadata)(url);
        res.json(metadata);
    }
    catch (error) {
        res.status(400).json({
            message: error.message || "Could not fetch YouTube details.",
        });
    }
}));
exports.default = router;
