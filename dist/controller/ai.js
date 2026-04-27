"use strict";
// src/routes/ai.ts
// POST /api/ai/ask — freeform Gemini AI call used by the Past Question AI panel.
// Rate-limited separately from summary generation.
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
const generative_ai_1 = require("@google/generative-ai");
const router = (0, express_1.Router)();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// POST /api/ai/ask
router.post("/ask", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { systemPrompt, userPrompt } = req.body;
        if (!(userPrompt === null || userPrompt === void 0 ? void 0 : userPrompt.trim())) {
            res.status(400).json({ message: "userPrompt is required." });
            return;
        }
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        // Combine system context + user question
        const fullPrompt = systemPrompt
            ? `${systemPrompt}\n\n---\n\n${userPrompt}`
            : userPrompt;
        const result = yield model.generateContent(fullPrompt);
        const response = result.response.text();
        res.json({ response });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "AI request failed.";
        console.error("AI ask error:", message);
        res.status(500).json({ message });
    }
}));
exports.default = router;
