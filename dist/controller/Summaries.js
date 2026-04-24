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
// src/routes/summaries.ts
const express_1 = require("express");
const Auth_1 = require("../middleware/Auth");
const Resource_1 = __importDefault(require("../models/Resource"));
const Summary_1 = __importDefault(require("../models/Summary"));
const geminiService_1 = require("../services/geminiService");
const router = (0, express_1.Router)();
router.get("/:resourceId", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const summary = yield Summary_1.default.findOne({ resourceId: req.params.resourceId });
        if (!summary) {
            res.status(404).json({ message: "No summary yet." });
            return;
        }
        res.json({ summary });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch summary." });
    }
}));
router.post("/:resourceId/generate", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const resource = yield Resource_1.default.findById(req.params.resourceId);
        if (!resource) {
            res.status(404).json({ message: "Resource not found." });
            return;
        }
        const summary = yield (0, geminiService_1.generateResourceSummary)({
            resourceId: resource._id, title: resource.title, subject: resource.subject,
            level: resource.level, type: resource.type, content: resource.content, url: resource.url,
        });
        res.json({ summary });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to generate summary." });
    }
}));
exports.default = router;
