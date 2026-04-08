// src/routes/auth.ts  (updated)
// Key changes:
// 1. POST /api/auth/sync  — generates Firebase verification link, passes to welcome email
// 2. POST /api/auth/verify-email — sends verified confirmation email
// 3. POST /api/auth/password-changed — called by frontend after password update, sends notification email

import { Router, Response } from "express";
import { protect } from "../middleware/Auth";
import user from "../models/user";
import {
  sendWelcomeEmail,
  sendEmailVerifiedConfirmation,
  sendPasswordChangedEmail,
} from "../services/EmailService";
import { auth } from "../utils/Firebase";
import type { AuthRequest, IUserDocument } from "../types/index.js";

const router = Router();

function sanitizeUser(user: IUserDocument) {
  return {
    id:                   user._id,
    firebaseUid:          user.firebaseUid,
    email:                user.email,
    displayName:          user.displayName,
    photoURL:             user.photoURL,
    isAdmin:              user.isAdmin,
    isVerified:           user.isVerified,
    classLevel:           user.classLevel,
    subjects:             user.subjects,
    streak:               user.streak,
    totalResourcesViewed: user.totalResourcesViewed,
    totalBookmarks:       user.totalBookmarks,
    emailPreferences:     user.emailPreferences,
    createdAt:            user.createdAt,
  };
}

// ── POST /api/auth/sync ───────────────────────────────────────────────────────
// Called by frontend right after Firebase sign-up or login.
// On first call: creates MongoDB user + generates Firebase email verification
// link + sends welcome email (which contains the verification link).
router.post("/sync", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { classLevel, subjects } = req.body as {
      classLevel?: string;
      subjects?: string[];
    };
    const user = req.user!;
    let isNewUser = false;

    if (classLevel) user.classLevel = classLevel;
    if (subjects)   user.subjects   = subjects;

    if (!user.emailPreferences.welcomeSent) {
      console.log(`🔗 Generating verification link for ${user.email}`);
      // Generate a Firebase email verification link via Admin SDK.
      // This produces a secure one-time URL the student clicks to verify.
      // actionCodeSettings is optional — set continueUrl to redirect after verification.
      const verificationLink = await auth.generateEmailVerificationLink(
        user.email,
        {
          url: `${process.env.CLIENT_URL}/verify-success`,
        }
      );
      console.log(`✅ Verification link generated: ${verificationLink.substring(0, 50)}...`);

      await sendWelcomeEmail({
        to:               user.email,
        name:             user.displayName,
        verificationLink, // embedded in the welcome email button
      });

      user.emailPreferences.welcomeSent = true;
      isNewUser = true;
    }

    await user.save();

    res.status(200).json({
      message: isNewUser
        ? "Account synced. Welcome email with verification link sent."
        : "Account synced.",
      user: sanitizeUser(user),
    });
  } catch (error:any) {
    console.error("Auth sync error:", (error as Error).message);
    res.status(500).json({ message: error.message});
  }
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
// Called by frontend after Firebase confirms the email is verified.
// Flips isVerified in MongoDB and sends confirmation email.
router.post("/verify-email", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
      await sendEmailVerifiedConfirmation({
        to:   user.email,
        name: user.displayName,
      });
    }
    res.status(200).json({ message: "Email verified.", user: sanitizeUser(user) });
  } catch {
    res.status(500).json({ message: "Failed to confirm email verification." });
  }
});

// ── POST /api/auth/password-changed ──────────────────────────────────────────
// Called by frontend after the student successfully changes their password
// (via Firebase updatePassword). Sends a security notification email.
router.post("/password-changed", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    await sendPasswordChangedEmail({ to: user.email, name: user.displayName });
    res.status(200).json({ message: "Password change notification sent." });
  } catch {
    res.status(500).json({ message: "Failed to send notification." });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(200).json({ user: sanitizeUser(req.user!) });
});

// ── PATCH /api/auth/profile ───────────────────────────────────────────────────
router.patch("/profile", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, classLevel, subjects, emailPreferences } = req.body as {
      displayName?: string;
      classLevel?: string;
      subjects?: string[];
      emailPreferences?: Partial<IUserDocument["emailPreferences"]>;
    };
    const user = req.user!;
    if (displayName)      user.displayName   = displayName;
    if (classLevel)       user.classLevel    = classLevel;
    if (subjects)         user.subjects      = subjects;
    if (emailPreferences) Object.assign(user.emailPreferences, emailPreferences);
    await user.save();
    res.status(200).json({ message: "Profile updated.", user: sanitizeUser(user) });
  } catch {
    res.status(500).json({ message: "Failed to update profile." });
  }
});

export default router;