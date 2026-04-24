// src/routes/ai.ts
// POST /api/ai/ask — freeform Gemini AI call used by the Past Question AI panel.
// Rate-limited separately from summary generation.

import { Router, Response } from "express";
import { protect } from "../middleware/Auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AuthRequest } from "../types/index";

const router = Router();
const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// POST /api/ai/ask
router.post("/ask", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { systemPrompt, userPrompt } = req.body as {
      systemPrompt?: string;
      userPrompt:    string;
    };

    if (!userPrompt?.trim()) {
      res.status(400).json({ message: "userPrompt is required." });
      return;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Combine system context + user question
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n---\n\n${userPrompt}`
      : userPrompt;

    const result   = await model.generateContent(fullPrompt);
    const response = result.response.text();

    res.json({ response });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed.";
    console.error("AI ask error:", message);
    res.status(500).json({ message });
  }
});

export default router;