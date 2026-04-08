"use strict";
// src/routes/pastQuestions.ts
// GET  /api/past-questions           — list with optional examBody/subject/year filter
// GET  /api/past-questions/counts    — resource counts per subject (for Subjects page)
// GET  /api/past-questions/:id       — single past question (increments views)
// POST /api/past-questions           — admin: add new past question
// DELETE /api/past-questions/:id     — admin: delete
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
const isAdmin_js_1 = require("../middleware/isAdmin.js");
const pastQuestion_1 = __importDefault(require("../models/pastQuestion"));
const router = (0, express_1.Router)();
// ── GET /api/past-questions ───────────────────────────────────────────────────
router.get("/", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { examBody, subject, year } = req.query;
        const filter = { isPublished: true };
        if (examBody && examBody !== "All")
            filter.examBody = examBody;
        if (subject && subject !== "All")
            filter.subject = subject;
        if (year && year !== "All")
            filter.year = parseInt(year);
        const questions = yield pastQuestion_1.default.find(filter)
            .sort({ year: -1 })
            .select("-fileUrl"); // don't expose URL in list — only in single fetch
        res.json({ questions });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch past questions." });
    }
}));
// ── GET /api/past-questions/summary ──────────────────────────────────────────
// Returns exam bodies with their subjects and available years.
// Used by the Past Questions landing page to build the cards.
router.get("/summary", Auth_1.protect, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const summary = yield pastQuestion_1.default.aggregate([
            { $match: { isPublished: true } },
            {
                $group: {
                    _id: { examBody: "$examBody", subject: "$subject" },
                    years: { $addToSet: "$year" },
                    count: { $sum: 1 },
                    latestYear: { $max: "$year" },
                },
            },
            {
                $group: {
                    _id: "$_id.examBody",
                    subjects: {
                        $push: {
                            subject: "$_id.subject",
                            years: "$years",
                            count: "$count",
                            latestYear: "$latestYear",
                        },
                    },
                    totalCount: { $sum: "$count" },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        res.json({ summary });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch summary." });
    }
}));
// ── GET /api/past-questions/subject-counts ────────────────────────────────────
// Used by the Subjects page to show how many past questions exist per subject.
router.get("/subject-counts", Auth_1.protect, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const counts = yield pastQuestion_1.default.aggregate([
            { $match: { isPublished: true } },
            { $group: { _id: "$subject", count: { $sum: 1 } } },
        ]);
        res.json({ counts });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch subject counts." });
    }
}));
// ── GET /api/past-questions/:id ───────────────────────────────────────────────
router.get("/:id", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const question = yield pastQuestion_1.default.findById(req.params.id);
        if (!question) {
            res.status(404).json({ message: "Past question not found." });
            return;
        }
        question.views += 1;
        yield question.save();
        res.json({ question });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch past question." });
    }
}));
// ── POST /api/past-questions — admin only ─────────────────────────────────────
router.post("/", Auth_1.protect, isAdmin_js_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const question = yield pastQuestion_1.default.create(Object.assign(Object.assign({}, req.body), { addedBy: req.user.firebaseUid }));
        res.status(201).json({ message: "Past question added.", question });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
// ── DELETE /api/past-questions/:id — admin only ───────────────────────────────
router.delete("/:id", Auth_1.protect, isAdmin_js_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield pastQuestion_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: "Past question deleted." });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to delete." });
    }
}));
exports.default = router;
