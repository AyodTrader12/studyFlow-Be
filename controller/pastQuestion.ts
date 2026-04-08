// src/routes/pastQuestions.ts
// GET  /api/past-questions           — list with optional examBody/subject/year filter
// GET  /api/past-questions/counts    — resource counts per subject (for Subjects page)
// GET  /api/past-questions/:id       — single past question (increments views)
// POST /api/past-questions           — admin: add new past question
// DELETE /api/past-questions/:id     — admin: delete

import { Router, Response } from "express";
import { protect }  from "../middleware/Auth";
import { isAdmin }  from "../middleware/isAdmin.js";
import PastQuestion from "../models/pastQuestion"
import type { AuthRequest } from "../types/index";

const router = Router();

// ── GET /api/past-questions ───────────────────────────────────────────────────
router.get("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { examBody, subject, year } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { isPublished: true };
    if (examBody && examBody !== "All") filter.examBody = examBody;
    if (subject  && subject  !== "All") filter.subject  = subject;
    if (year     && year     !== "All") filter.year      = parseInt(year);

    const questions = await PastQuestion.find(filter)
      .sort({ year: -1 })
      .select("-fileUrl"); // don't expose URL in list — only in single fetch

    res.json({ questions });
  } catch {
    res.status(500).json({ message: "Failed to fetch past questions." });
  }
});

// ── GET /api/past-questions/summary ──────────────────────────────────────────
// Returns exam bodies with their subjects and available years.
// Used by the Past Questions landing page to build the cards.
router.get("/summary", protect, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await PastQuestion.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id:      { examBody: "$examBody", subject: "$subject" },
          years:    { $addToSet: "$year" },
          count:    { $sum: 1 },
          latestYear: { $max: "$year" },
        },
      },
      {
        $group: {
          _id:      "$_id.examBody",
          subjects: {
            $push: {
              subject:    "$_id.subject",
              years:      "$years",
              count:      "$count",
              latestYear: "$latestYear",
            },
          },
          totalCount: { $sum: "$count" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ summary });
  } catch {
    res.status(500).json({ message: "Failed to fetch summary." });
  }
});

// ── GET /api/past-questions/subject-counts ────────────────────────────────────
// Used by the Subjects page to show how many past questions exist per subject.
router.get("/subject-counts", protect, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const counts = await PastQuestion.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$subject", count: { $sum: 1 } } },
    ]);
    res.json({ counts });
  } catch {
    res.status(500).json({ message: "Failed to fetch subject counts." });
  }
});

// ── GET /api/past-questions/:id ───────────────────────────────────────────────
router.get("/:id", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const question = await PastQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ message: "Past question not found." });
      return;
    }
    question.views += 1;
    await question.save();
    res.json({ question });
  } catch {
    res.status(500).json({ message: "Failed to fetch past question." });
  }
});

// ── POST /api/past-questions — admin only ─────────────────────────────────────
router.post("/", protect, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const question = await PastQuestion.create({
      ...req.body,
      addedBy: req.user!.firebaseUid,
    });
    res.status(201).json({ message: "Past question added.", question });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// ── DELETE /api/past-questions/:id — admin only ───────────────────────────────
router.delete("/:id", protect, isAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await PastQuestion.findByIdAndDelete(req.params.id);
    res.json({ message: "Past question deleted." });
  } catch {
    res.status(500).json({ message: "Failed to delete." });
  }
});

export default router;