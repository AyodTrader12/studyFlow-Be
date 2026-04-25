"use strict";
// server/src/services/geminiService.ts
// FIXED: gemini-1.5-flash was deprecated by Google in early 2026.
// Current free tier models as of April 2026:
//   - gemini-2.5-flash-lite  → 15 RPM, 1000/day  (best for free tier)
//   - gemini-2.5-flash       → 10 RPM, 250/day
//   - gemini-2.5-pro         → 5 RPM,  100/day
//
// We use gemini-2.5-flash-lite as default — highest daily limit on free tier.
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
exports.generateResourceSummary = generateResourceSummary;
const generative_ai_1 = require("@google/generative-ai");
const Summary_js_1 = __importDefault(require("../models/Summary.js"));
// ── Model selection ───────────────────────────────────────────────────────────
// Change this if you upgrade to a paid account:
// Paid:  "gemini-2.5-flash" or "gemini-2.5-pro"
// Free:  "gemini-2.5-flash-lite" (1000 req/day) ← current setting
const MODEL_NAME = "gemini-2.5-flash-lite";
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
function generateResourceSummary(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const { resourceId, title, subject, level, type, content } = params;
        // Return cached summary — never call Gemini twice for the same resource
        const cached = yield Summary_js_1.default.findOne({ resourceId });
        if (cached)
            return cached;
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set. Add it to your .env file. " +
                "Get a free key at aistudio.google.com");
        }
        let model;
        try {
            model = genAI.getGenerativeModel({ model: MODEL_NAME });
        }
        catch (_e) {
            throw new Error(`Could not load Gemini model "${MODEL_NAME}". ` +
                "Check your GEMINI_API_KEY is from Google AI Studio (aistudio.google.com), " +
                "not from Google Cloud Vertex AI.");
        }
        const prompt = buildPrompt({ title, subject, level, type, content });
        const MAX_RETRIES = 2;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = yield model.generateContent(prompt);
                const text = result.response.text();
                const clean = text
                    .replace(/```json\n?/g, "")
                    .replace(/```\n?/g, "")
                    .trim();
                let parsed;
                try {
                    parsed = JSON.parse(clean);
                }
                catch (_f) {
                    // Gemini sometimes returns valid text but not JSON — wrap it
                    parsed = {
                        summary: clean.slice(0, 500),
                        keyPoints: [],
                        examQuestions: [],
                    };
                }
                const summary = yield Summary_js_1.default.create({
                    resourceId,
                    summary: (_a = parsed.summary) !== null && _a !== void 0 ? _a : "",
                    keyPoints: (_b = parsed.keyPoints) !== null && _b !== void 0 ? _b : [],
                    examQuestions: (_c = parsed.examQuestions) !== null && _c !== void 0 ? _c : [],
                });
                return summary;
            }
            catch (error) {
                const message = (_d = error.message) !== null && _d !== void 0 ? _d : "Unknown error";
                // 429 — rate limit, wait and retry
                if (message.includes("429") || message.includes("quota")) {
                    if (attempt < MAX_RETRIES) {
                        const retryMatch = message.match(/(\d+)s/);
                        const waitSecs = retryMatch ? Math.min(parseInt(retryMatch[1]), 12) : 5;
                        console.log(`Gemini rate limit hit. Retrying in ${waitSecs}s... (${attempt + 1}/${MAX_RETRIES})`);
                        yield new Promise((r) => setTimeout(r, waitSecs * 1000));
                        continue;
                    }
                    throw new Error("Gemini is temporarily rate-limited. " +
                        `Free tier limit: 15 requests/min, 1000/day on ${MODEL_NAME}. ` +
                        "Please try again in a moment.");
                }
                // 404 — wrong model name
                if (message.includes("404") || message.includes("not found")) {
                    throw new Error(`Gemini model "${MODEL_NAME}" not found. ` +
                        "Your API key may be from Vertex AI instead of Google AI Studio. " +
                        "Get the correct key at aistudio.google.com");
                }
                // 403 / auth error
                if (message.includes("403") || message.includes("API_KEY") || message.includes("invalid")) {
                    throw new Error("Invalid Gemini API key. " +
                        "Go to aistudio.google.com → Get API key → copy the key → paste into GEMINI_API_KEY in .env");
                }
                throw new Error(`Failed to generate summary: ${message}`);
            }
        }
        throw new Error("Failed after retries. Please try again in a minute.");
    });
}
function buildPrompt(params) {
    const { title, subject, level, type, content } = params;
    const schema = `{"summary":"...","keyPoints":["...","...","...","...","..."],"examQuestions":["...","...","..."]}`;
    if (type === "notes" && content) {
        return `You are a helpful tutor for Nigerian secondary school students.

Study note: "${title}" | Subject: ${subject} | Level: ${level}

CONTENT:
${content.slice(0, 6000)}

Give:
1. A clear SUMMARY (5-10 sentences) for a ${level} student
2. Exactly 7 KEY POINTS
3. Exactly 5 EXAM-STYLE QUESTIONS

Reply ONLY with this JSON, no markdown or extra text:
${schema}`.trim();
    }
    return `You are a helpful tutor for Nigerian secondary school students.

A student just studied: "${title}"
Subject: ${subject} | Level: ${level} | Type: ${type}

Based on the Nigerian secondary school curriculum for this topic, give:
1. A clear SUMMARY (5-10 sentences)
2. Exactly 7 KEY POINTS
3. Exactly 5 EXAM-STYLE QUESTIONS

Reply ONLY with this JSON, no markdown or extra text:
${schema}`.trim();
}
