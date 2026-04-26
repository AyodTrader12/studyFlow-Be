// server/src/services/geminiService.ts
// FIXED: gemini-1.5-flash was deprecated by Google in early 2026.
// Current free tier models as of April 2026:
//   - gemini-2.5-flash-lite  → 15 RPM, 1000/day  (best for free tier)
//   - gemini-2.5-flash       → 10 RPM, 250/day
//   - gemini-2.5-pro         → 5 RPM,  100/day
//
// We use gemini-2.5-flash-lite as default — highest daily limit on free tier.

import { GoogleGenerativeAI } from "@google/generative-ai";
import Summary from "../models/Summary";

// ── Model selection ───────────────────────────────────────────────────────────
// Change this if you upgrade to a paid account:
// Paid:  "gemini-2.5-flash" or "gemini-2.5-pro"
// Free:  "gemini-2.5-flash-lite" (1000 req/day) ← current setting
const MODEL_NAME = "gemini-2.5-flash-lite";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateResourceSummary(params: {
  resourceId: any;
  title:      string;
  subject:    string;
  level:      string;
  type:       string;
  content?:   string;
  url?:       string;
}) {
  const { resourceId, title, subject, level, type, content } = params;

  // Return cached summary — never call Gemini twice for the same resource
  const cached = await Summary.findOne({ resourceId });
  if (cached) return cached;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your .env file. " +
      "Get a free key at aistudio.google.com"
    );
  }

  let model;
  try {
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
  } catch {
    throw new Error(
      `Could not load Gemini model "${MODEL_NAME}". ` +
      "Check your GEMINI_API_KEY is from Google AI Studio (aistudio.google.com), " +
      "not from Google Cloud Vertex AI."
    );
  }

  const prompt = buildPrompt({ title, subject, level, type, content });

  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text   = result.response.text();
      const clean  = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      let parsed: { summary?: string; keyPoints?: string[]; examQuestions?: string[] };
      try {
        parsed = JSON.parse(clean);
      } catch {
        // Gemini sometimes returns valid text but not JSON — wrap it
        parsed = {
          summary:       clean.slice(0, 500),
          keyPoints:     [],
          examQuestions: [],
        };
      }

      const summary = await Summary.create({
        resourceId,
        summary:       parsed.summary       ?? "",
        keyPoints:     parsed.keyPoints      ?? [],
        examQuestions: parsed.examQuestions  ?? [],
      });

      return summary;

    } catch (error) {
      const message = (error as Error).message ?? "Unknown error";

      // 429 — rate limit, wait and retry
      if (message.includes("429") || message.includes("quota")) {
        if (attempt < MAX_RETRIES) {
          const retryMatch = message.match(/(\d+)s/);
          const waitSecs   = retryMatch ? Math.min(parseInt(retryMatch[1]), 12) : 5;
          console.log(`Gemini rate limit hit. Retrying in ${waitSecs}s... (${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, waitSecs * 1000));
          continue;
        }
        throw new Error(
          "Gemini is temporarily rate-limited. " +
          `Free tier limit: 15 requests/min, 1000/day on ${MODEL_NAME}. ` +
          "Please try again in a moment."
        );
      }

      // 404 — wrong model name
      if (message.includes("404") || message.includes("not found")) {
        throw new Error(
          `Gemini model "${MODEL_NAME}" not found. ` +
          "Your API key may be from Vertex AI instead of Google AI Studio. " +
          "Get the correct key at aistudio.google.com"
        );
      }

      // 403 / auth error
      if (message.includes("403") || message.includes("API_KEY") || message.includes("invalid")) {
        throw new Error(
          "Invalid Gemini API key. " +
          "Go to aistudio.google.com → Get API key → copy the key → paste into GEMINI_API_KEY in .env"
        );
      }

      throw new Error(`Failed to generate summary: ${message}`);
    }
  }

  throw new Error("Failed after retries. Please try again in a minute.");
}

function buildPrompt(params: {
  title:    string;
  subject:  string;
  level:    string;
  type:     string;
  content?: string;
}): string {
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