// server/src/routes/auth.ts
// All authentication endpoints. No Firebase — pure MongoDB + bcrypt + JWT.
//
// POST /api/auth/signup          — create account, send verification OTP
// POST /api/auth/verify-otp      — verify 6-digit code, activate account
// POST /api/auth/resend-otp      — send a fresh OTP (if expired or lost)
// POST /api/auth/login           — email + password login, issues JWT cookie
// POST /api/auth/logout          — clear the JWT cookie
// POST /api/auth/forgot-password — send password reset OTP
// POST /api/auth/reset-password  — verify reset OTP + set new password
// GET  /api/auth/me              — return the logged-in user's profile

import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import User   from "../models/user";
import { generateOtp, otpExpiresAt, verifyOtp } from "../services/OtpService";
import { signToken }   from "../services/TokenService";
import {
  sendVerificationOtp,
  sendVerifiedConfirmation,
  sendPasswordResetOtp,
  sendPasswordChangedEmail,
  sendWelcomeEmail,
} from "../services/EmailService";
import { protect } from "../middleware/Auth";
import type { AuthRequest } from "../types/Auth";
import type { IUserDocument } from "../models/user";
const router = Router();

// ── Helper: sanitize user for API response (never expose passwordHash / OTP) ─
function sanitize(user: IUserDocument) {
  return {
    
    id:                   user._id,
    displayName:          user.displayName,
    email:                user.email,
    isVerified:           user.isVerified,
    isAdmin:              user.isAdmin,
    classLevel:           user.classLevel,
    subjects:             user.subjects,
    photoURL:             user.photoURL,
    streak:               user.streak,
    totalResourcesViewed: user.totalResourcesViewed,
    totalBookmarks:       user.totalBookmarks,
    emailPreferences:     user.emailPreferences,
    createdAt:            user.createdAt,
  };
}

// ── Helper: set the JWT as an httpOnly cookie ─────────────────────────────────
function setTokenCookie(res: Response, token: string): void {
  res.cookie("sf_token", token, {
    httpOnly: true,
    secure: true,            // MUST be true if sameSite is "none"
    sameSite: "none",        // Allows cross-site cookie usage
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}
// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    const { displayName, email, password } = req.body as {
      displayName?: string;
      email?:       string;
      password?:    string;
    };

    // Validation
    if (!displayName?.trim()) { res.status(400).json({ message: "Name is required." });            return; }
    if (!email?.trim())       { res.status(400).json({ message: "Email is required." });           return; }
    if (!password)            { res.status(400).json({ message: "Password is required." });        return; }
    if (password.length < 6)  { res.status(400).json({ message: "Password must be at least 6 characters." }); return; }
    if (!/\S+@\S+\.\S+/.test(email)) {
      res.status(400).json({ message: "Enter a valid email address." });
      return;
    }

    // Check duplicate
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      if (existing.isVerified) {
        res.status(409).json({ message: "An account with this email already exists." });
      } else {
        // Account exists but unverified — resend OTP
        const { plain, hash } = await generateOtp();
        existing.otp = { code: hash, expiresAt: otpExpiresAt(), purpose: "verify" };
        await existing.save();
        await sendVerificationOtp({ to: existing.email, name: existing.displayName, otp: plain });
        res.status(200).json({
          message: "Account already exists but is unverified. A new code has been sent.",
          email:   existing.email,
        });
      }
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate OTP
    const { plain, hash } = await generateOtp();

    // Create user
    const user = await User.create({
      displayName: displayName.trim(),
      email:       email.toLowerCase().trim(),
      passwordHash,
      otp: {
        code:      hash,
        expiresAt: otpExpiresAt(),
        purpose:   "verify",
      },
    });

    // Send verification OTP email
    await sendVerificationOtp({ to: user.email, name: user.displayName, otp: plain });

 

    res.status(201).json({
      message: "Account created. Check your email for the 6-digit verification code.",
      email:   user.email,
    });
  } catch (error:any) {
    console.error("Signup error:", (error as Error).message);
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post("/verify-otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };

    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP code are required." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(404).json({ message: "Account not found." });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: "This account is already verified. Please log in." });
      return;
    }

    if (user.otp.purpose !== "verify") {
      res.status(400).json({ message: "No verification code found. Please request a new one." });
      return;
    }

    const { valid, reason } = await verifyOtp({
      plain:     otp.trim(),
      hash:      user.otp.code,
      expiresAt: user.otp.expiresAt,
    });

    if (!valid) {
      res.status(400).json({ message: reason });
      return;
    }

    // Mark verified and clear OTP
    user.isVerified = true;
    user.otp        = { code: null, expiresAt: null, purpose: null };
    await user.save();

    // Send two emails: verified confirmation + welcome
    await sendVerifiedConfirmation({ to: user.email, name: user.displayName });
    await sendWelcomeEmail({ to: user.email, name: user.displayName });

    res.status(200).json({
      message: "Email verified! You can now log in.",
    });
  } catch (error) {
    console.error("Verify OTP error:", (error as Error).message);
    res.status(500).json({ message: "Verification failed. Please try again." });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
// Resends a fresh OTP for either "verify" or "reset" purpose
router.post("/resend-otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, purpose } = req.body as {
      email?:   string;
      purpose?: "verify" | "reset";
    };

    if (!email)   { res.status(400).json({ message: "Email is required." });   return; }
    if (!purpose) { res.status(400).json({ message: "Purpose is required." }); return; }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal whether the email exists — security best practice
      res.status(200).json({ message: "If that email exists, a new code has been sent." });
      return;
    }

    if (purpose === "verify" && user.isVerified) {
      res.status(400).json({ message: "This account is already verified." });
      return;
    }

    const { plain, hash } = await generateOtp();
    user.otp = { code: hash, expiresAt: otpExpiresAt(), purpose };
    await user.save();

    if (purpose === "verify") {
      await sendVerificationOtp({ to: user.email, name: user.displayName, otp: plain });
    } else {
      await sendPasswordResetOtp({ to: user.email, name: user.displayName, otp: plain });
    }

    res.status(200).json({ message: "A new code has been sent to your email." });
  } catch (error) {
    console.error("Resend OTP error:", (error as Error).message);
    res.status(500).json({ message: "Failed to resend code. Please try again." });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        message:       "Please verify your email before logging in.",
        needsVerify:   true,
        email:         user.email,
      });
      return;
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    // Sign JWT and set cookie
    const token = signToken({
      userId:  user._id.toString(),
      email:   user.email,
      isAdmin: user.isAdmin,
    });

    setTokenCookie(res, token);

    res.status(200).json({
      message: "Logged in successfully.",
      user:    sanitize(user),
    });
  } catch (error) {
    console.error("Login error:", (error as Error).message);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("sf_token", { path: "/" });
  res.status(200).json({ message: "Logged out." });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) { res.status(400).json({ message: "Email is required." }); return; }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal whether the email exists
      res.status(200).json({ message: "If that email exists, a reset code has been sent." });
      return;
    }

    const { plain, hash } = await generateOtp();
    user.otp = { code: hash, expiresAt: otpExpiresAt(), purpose: "reset" };
    await user.save();

    await sendPasswordResetOtp({ to: user.email, name: user.displayName, otp: plain });

    res.status(200).json({
      message: "A 6-digit reset code has been sent to your email.",
      email:   user.email,
    });
  } catch (error) {
    console.error("Forgot password error:", (error as Error).message);
    res.status(500).json({ message: "Failed to send reset code. Please try again." });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body as {
      email?:       string;
      otp?:         string;
      newPassword?: string;
    };

    if (!email || !otp || !newPassword) {
      res.status(400).json({ message: "Email, OTP code and new password are required." });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) { res.status(404).json({ message: "Account not found." }); return; }

    if (user.otp.purpose !== "reset") {
      res.status(400).json({ message: "No reset code found. Please request a new one." });
      return;
    }

    const { valid, reason } = await verifyOtp({
      plain:     otp.trim(),
      hash:      user.otp.code,
      expiresAt: user.otp.expiresAt,
    });

    if (!valid) { res.status(400).json({ message: reason }); return; }

    // Set new password and clear OTP
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.otp          = { code: null, expiresAt: null, purpose: null };
    await user.save();

    await sendPasswordChangedEmail({ to: user.email, name: user.displayName });

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", (error as Error).message);
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", protect, (req: AuthRequest, res: Response): void => {
  res.status(200).json({ user: sanitize(req.user!) });
});

// ── PATCH /api/auth/profile ───────────────────────────────────────────────────
router.patch("/profile", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, classLevel, subjects, emailPreferences } = req.body as {
      displayName?:      string;
      classLevel?:       string;
      subjects?:         string[];
      emailPreferences?: Partial<IUserDocument["emailPreferences"]>;
    };
    const user = req.user!;
    if (displayName)      user.displayName   = displayName.trim();
    if (classLevel !== undefined) user.classLevel = classLevel;
    if (subjects)         user.subjects      = subjects;
    if (emailPreferences) Object.assign(user.emailPreferences, emailPreferences);
    await user.save();
    res.status(200).json({ message: "Profile updated.", user: sanitize(user) });
  } catch {
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
// For logged-in users changing their password from Settings
router.post("/change-password", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?:     string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Current and new passwords are required." });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: "New password must be at least 6 characters." });
      return;
    }

    const user = req.user!;
    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      res.status(401).json({ message: "Current password is incorrect." });
      return;
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    await sendPasswordChangedEmail({ to: user.email, name: user.displayName });

    // Clear the session cookie — user must log in again with new password
    res.clearCookie("sf_token", { path: "/" });

    res.status(200).json({
      message: "Password changed successfully. Please log in with your new password.",
    });
  } catch {
    res.status(500).json({ message: "Failed to change password." });
  }
});

export default router;