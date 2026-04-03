// src/routes/summaries.ts
import { Router, Response } from "express";
import { protect } from "../middleware/Auth";
import Resource from "../models/Resource";
import Summary from "../models/Summary";
import { generateResourceSummary } from "../services/GeminiService";
import type { AuthRequest } from "../types/index";

const router = Router();

router.get("/:resourceId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await Summary.findOne({ resourceId: req.params.resourceId });
    if (!summary) { res.status(404).json({ message: "No summary yet." }); return; }
    res.json({ summary });
  } catch { res.status(500).json({ message: "Failed to fetch summary." }); }
});

router.post("/:resourceId/generate", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resource = await Resource.findById(req.params.resourceId);
    if (!resource) { res.status(404).json({ message: "Resource not found." }); return; }
    const summary = await generateResourceSummary({
      resourceId: resource._id, title: resource.title, subject: resource.subject,
      level: resource.level, type: resource.type, content: resource.content, url: resource.url,
    });
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message || "Failed to generate summary." });
  }
});

export default router;