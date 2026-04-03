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
// src/routes/bookmarks.ts
const express_1 = require("express");
const Auth_1 = require("../middleware/Auth");
const Bookmark_1 = __importDefault(require("../models/Bookmark"));
const Resource_1 = __importDefault(require("../models/Resource"));
const user_1 = __importDefault(require("../models/user"));
const router = (0, express_1.Router)();
router.get("/", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookmarks = yield Bookmark_1.default.find({ userId: req.user._id }).populate({ path: "resourceId", select: "-content" }).sort({ createdAt: -1 });
        res.json({ bookmarks: bookmarks.map((b) => b.resourceId).filter(Boolean) });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch bookmarks." });
    }
}));
router.post("/:resourceId", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existing = yield Bookmark_1.default.findOne({ userId: req.user._id, resourceId: req.params.resourceId });
        if (existing) {
            res.status(400).json({ message: "Already bookmarked." });
            return;
        }
        yield Bookmark_1.default.create({ userId: req.user._id, resourceId: String(req.params.resourceId) });
        yield Resource_1.default.findByIdAndUpdate(req.params.resourceId, { $inc: { bookmarks: 1 } });
        yield user_1.default.findByIdAndUpdate(req.user._id, { $inc: { totalBookmarks: 1 } });
        res.status(201).json({ message: "Bookmarked successfully." });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to bookmark resource." });
    }
}));
router.delete("/:resourceId", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deleted = yield Bookmark_1.default.findOneAndDelete({ userId: req.user._id, resourceId: req.params.resourceId });
        if (!deleted) {
            res.status(404).json({ message: "Bookmark not found." });
            return;
        }
        yield Resource_1.default.findByIdAndUpdate(req.params.resourceId, { $inc: { bookmarks: -1 } });
        yield user_1.default.findByIdAndUpdate(req.user._id, { $inc: { totalBookmarks: -1 } });
        res.json({ message: "Bookmark removed." });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to remove bookmark." });
    }
}));
exports.default = router;
