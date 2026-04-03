// src/routes/auth.ts
import { Router, Response } from "express";
import { protect } from "../middleware/Auth.js";
import user from "../models/user.js";
import { sendEmailVerifiedConfirmation,sendWelcomeEmail } from "../services/EmailService.js";
import type { AuthRequest, IUserDocument } from "../types/index.js";

const router = Router();

function sanitizeUser(user: IUserDocument) {
  return {
    id: user._id, firebaseUid: user.firebaseUid, email: user.email,
    displayName: user.displayName, photoURL: user.photoURL, isAdmin: user.isAdmin,
    isVerified: user.isVerified, classLevel: user.classLevel, subjects: user.subjects,
    streak: user.streak, totalResourcesViewed: user.totalResourcesViewed,
    totalBookmarks: user.totalBookmarks, emailPreferences: user.emailPreferences,
    createdAt: user.createdAt,
  };
}

router.post("/sync", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classLevel, subjects } = req.body as { classLevel?: string; subjects?: string[] };
    const user = req.user!;
    let isNewUser = false;
    if (classLevel) user.classLevel = classLevel;
    if (subjects)   user.subjects   = subjects;
    if (!user.emailPreferences.welcomeSent) {
      await sendWelcomeEmail({ to: user.email, name: user.displayName });
      user.emailPreferences.welcomeSent = true;
      isNewUser = true;
    }
    await user.save();
    res.status(200).json({ message: isNewUser ? "Account synced and welcome email sent." : "Account synced.", user: sanitizeUser(user) });
  } catch (error) {
    console.error("Auth sync error:", (error as Error).message);
    res.status(500).json({ message: "Failed to sync account." });
  }
});

router.post("/verify-email", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
      await sendEmailVerifiedConfirmation({ to: user.email, name: user.displayName });
    }
    res.status(200).json({ message: "Email verified.", user: sanitizeUser(user) });
  } catch { res.status(500).json({ message: "Failed to confirm email verification." }); }
});

router.get("/me", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(200).json({ user: sanitizeUser(req.user!) });
});

router.patch("/profile", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, classLevel, subjects, emailPreferences } = req.body as {
      displayName?: string; classLevel?: string; subjects?: string[];
      emailPreferences?: Partial<IUserDocument["emailPreferences"]>;
    };
    const user = req.user!;
    if (displayName)      user.displayName   = displayName;
    if (classLevel)       user.classLevel    = classLevel;
    if (subjects)         user.subjects      = subjects;
    if (emailPreferences) Object.assign(user.emailPreferences, emailPreferences);
    await user.save();
    res.status(200).json({ message: "Profile updated.", user: sanitizeUser(user) });
  } catch { res.status(500).json({ message: "Failed to update profile." }); }
});

export default router;