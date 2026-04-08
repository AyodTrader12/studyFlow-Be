"use strict";
// // src/services/geminiService.ts
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import Summary from "../models/Summary";
// import type {
//   GenerateSummaryParams,
//   GeminiSummaryResponse,
//   ISummaryDocument,
// } from "../types/index";
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// export async function generateResourceSummary(
//   params: GenerateSummaryParams
// ): Promise<ISummaryDocument> {
//   const { resourceId, title, subject, level, type, content } = params;
//   // Return cached summary if it already exists
//   const cached = await Summary.findOne({ resourceId });
//   if (cached) return cached;
//   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
//   const prompt = buildPrompt({ title, subject, level, type, content });
//   try {
//     const result = await model.generateContent(prompt);
//     const text   = result.response.text();
//     // Strip markdown code fences if Gemini wraps the JSON
//     const clean  = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
//     const parsed = JSON.parse(clean) as GeminiSummaryResponse;
//     const summary = await Summary.create({
//       resourceId,
//       summary:       parsed.summary       ?? "",
//       keyPoints:     parsed.keyPoints      ?? [],
//       examQuestions: parsed.examQuestions  ?? [],
//     });
//     return summary;
//   } catch (error) {
//     const message = error instanceof Error ? error.message : "Unknown error";
//     throw new Error(`Failed to generate summary: ${message}`);
//   }
// }
// function buildPrompt({
//   title,
//   subject,
//   level,
//   type,
//   content,
// }: Pick<GenerateSummaryParams, "title" | "subject" | "level" | "type" | "content">): string {
//   const jsonSchema = `
// {
//   "summary": "3-5 sentence summary here",
//   "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
//   "examQuestions": ["question 1", "question 2", "question 3"]
// }`;
//   if (type === "notes" && content) {
//     return `
// You are a helpful tutor for Nigerian secondary school students.
// The following is a study note for ${subject} at the ${level} level, titled "${title}".
// STUDY NOTE CONTENT:
// ${content.slice(0, 8000)}
// Please provide:
// 1. A clear, simple SUMMARY (3–5 sentences) a ${level} student can easily understand
// 2. Exactly 5 KEY POINTS from this lesson (max 2 sentences each)
// 3. Exactly 3 EXAM-STYLE QUESTIONS a student should answer after reading this
// Respond ONLY with valid JSON in this exact format (no markdown fences):
// ${jsonSchema}
// Keep language simple and appropriate for a Nigerian secondary school student.
//     `.trim();
//   }
//   return `
// You are a helpful tutor for Nigerian secondary school students.
// A student just studied a resource titled "${title}" about "${subject}" (${level} level).
// Resource type: ${type}
// Based on this topic in the Nigerian secondary school curriculum, provide:
// 1. A clear SUMMARY of what this topic is about (3–5 sentences)
// 2. Exactly 5 KEY POINTS a student should understand
// 3. Exactly 3 EXAM-STYLE QUESTIONS on this topic
// Respond ONLY with valid JSON in this exact format (no markdown fences):
// ${jsonSchema}
// Keep language simple and appropriate for a Nigerian secondary school student.
//   `.trim();
// }
