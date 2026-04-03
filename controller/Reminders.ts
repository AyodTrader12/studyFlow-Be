// src/routes/reminders.ts
import { Router, Response } from "express";
import { protect } from "../middleware/Auth";
import Reminder from "../models/Reminder";
import type { AuthRequest } from "../types/index";

const router = Router();

router.get("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reminders = await Reminder.find({ userId: req.user!._id }).sort({ date: 1, time: 1 });
    res.json({ reminders });
  } catch { res.status(500).json({ message: "Failed to fetch reminders." }); }
});

router.post("/", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text, date, time } = req.body as { text?: string; date?: string; time?: string };
    if (!text || !date) { res.status(400).json({ message: "Text and date are required." }); return; }
    const reminder = await Reminder.create({ userId: req.user!._id, text, date, time: time ?? "08:00" });
    res.status(201).json({ message: "Reminder created.", reminder });
  } catch { res.status(500).json({ message: "Failed to create reminder." }); }
});

router.delete("/:id", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!reminder) { res.status(404).json({ message: "Reminder not found." }); return; }
    res.json({ message: "Reminder deleted." });
  } catch { res.status(500).json({ message: "Failed to delete reminder." }); }
});

export default router;