"use strict";
// server/src/services/geminiService.ts
// Fixed model name: "gemini-1.5-flash" → "gemini-2.0-flash"
// Google renamed/updated their models. gemini-2.0-flash is the current fast model.
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
const Summary_1 = __importDefault(require("../models/Summary"));
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use gemini-2.0-flash — the current stable fast model as of 2025
// If this also fails, change to "gemini-1.5-flash-latest" or "gemini-2.0-flash-lite"
// gemini-1.5-flash works on the free tier (15 requests/min, 1500/day)
const MODEL_NAME = "gemini-1.5-flash";
function generateResourceSummary(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const { resourceId, title, subject, level, type, content } = params;
        // Return cached summary if it already exists
        const cached = yield Summary_1.default.findOne({ resourceId });
        if (cached)
            return cached;
        let model;
        try {
            model = genAI.getGenerativeModel({ model: MODEL_NAME });
        }
        catch (error) {
            throw new Error(`Failed to load Gemini model "${MODEL_NAME}". Check your GEMINI_API_KEY and model availability.`);
        }
        const prompt = buildPrompt({ title, subject, level, type, content });
        // Retry up to 2 times on 429 quota errors
        const MAX_RETRIES = 2;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = yield model.generateContent(prompt);
                const text = result.response.text();
                const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                const parsed = JSON.parse(clean);
                const summary = yield Summary_1.default.create({
                    resourceId,
                    summary: (_a = parsed.summary) !== null && _a !== void 0 ? _a : "",
                    keyPoints: (_b = parsed.keyPoints) !== null && _b !== void 0 ? _b : [],
                    examQuestions: (_c = parsed.examQuestions) !== null && _c !== void 0 ? _c : [],
                });
                return summary;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                // 429 — quota exceeded, wait and retry
                if (message.includes("429") || message.includes("quota")) {
                    if (attempt < MAX_RETRIES) {
                        // Extract retry delay from error or default to 5 seconds
                        const retryMatch = message.match(/retry.*?(\d+)s/i);
                        const waitSecs = retryMatch ? Math.min(parseInt(retryMatch[1]), 10) : 5;
                        console.log(`Gemini quota hit. Waiting ${waitSecs}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
                        yield new Promise((r) => setTimeout(r, waitSecs * 1000));
                        continue; // retry
                    }
                    throw new Error("Gemini AI is temporarily unavailable due to rate limits. " +
                        "Please try again in a minute. " +
                        "The free tier allows 15 requests per minute and 1,500 per day.");
                }
                if (message.includes("404") || message.includes("not found")) {
                    throw new Error(`Gemini model "${MODEL_NAME}" not found. ` +
                        `Check your GEMINI_API_KEY is for Google AI Studio (not Vertex AI).`);
                }
                if (message.includes("403") || message.includes("API_KEY")) {
                    throw new Error("Invalid Gemini API key. Check GEMINI_API_KEY in your .env file.");
                }
                throw new Error(`Failed to generate summary: ${message}`);
            }
        }
        throw new Error("Failed to generate summary after retries.");
    });
}
function buildPrompt({ title, subject, level, type, content, }) {
    const jsonSchema = `{
  "summary": "3-5 sentence summary here",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "examQuestions": ["question 1", "question 2", "question 3"]
}`;
    if (type === "notes" && content) {
        return `You are a helpful tutor for Nigerian secondary school students.

The following is a study note for ${subject} at the ${level} level, titled "${title}".

STUDY NOTE CONTENT:
${content.slice(0, 8000)}

Please provide:
1. A clear, simple SUMMARY (3-5 sentences) a ${level} student can easily understand
2. Exactly 5 KEY POINTS from this lesson (max 2 sentences each)
3. Exactly 3 EXAM-STYLE QUESTIONS a student should answer after reading this

Respond ONLY with valid JSON (no markdown fences, no extra text):
${jsonSchema}

Keep language simple and appropriate for a Nigerian secondary school student.`.trim();
    }
    return `You are a helpful tutor for Nigerian secondary school students.

A student just studied a resource titled "${title}" about "${subject}" (${level} level).
Resource type: ${type}

Based on this topic in the Nigerian secondary school curriculum, provide:
1. A clear SUMMARY of what this topic is about (3-5 sentences)
2. Exactly 5 KEY POINTS a student should understand
3. Exactly 3 EXAM-STYLE QUESTIONS on this topic

Respond ONLY with valid JSON (no markdown fences, no extra text):
${jsonSchema}

Keep language simple and appropriate for a Nigerian secondary school student.`.trim();
}
