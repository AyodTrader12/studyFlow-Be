"use strict";
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
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_1 = __importDefault(require("../models/user"));
const OtpService_1 = require("../services/OtpService");
const TokenService_1 = require("../services/TokenService");
const EmailService_1 = require("../services/EmailService");
const Auth_1 = require("../middleware/Auth");
const router = (0, express_1.Router)();
// ── Helper: sanitize user for API response (never expose passwordHash / OTP) ─
function sanitize(user) {
    return {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        classLevel: user.classLevel,
        subjects: user.subjects,
        photoURL: user.photoURL,
        streak: user.streak,
        totalResourcesViewed: user.totalResourcesViewed,
        totalBookmarks: user.totalBookmarks,
        emailPreferences: user.emailPreferences,
        createdAt: user.createdAt,
    };
}
// ── Helper: set the JWT as an httpOnly cookie ─────────────────────────────────
function setTokenCookie(res, token) {
    res.cookie("sf_token", token, {
        httpOnly: true, // JS cannot read it
        secure: process.env.NODE_ENV === "production", // HTTPS only in prod
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        path: "/",
    });
}
// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { displayName, email, password } = req.body;
        // Validation
        if (!(displayName === null || displayName === void 0 ? void 0 : displayName.trim())) {
            res.status(400).json({ message: "Name is required." });
            return;
        }
        if (!(email === null || email === void 0 ? void 0 : email.trim())) {
            res.status(400).json({ message: "Email is required." });
            return;
        }
        if (!password) {
            res.status(400).json({ message: "Password is required." });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ message: "Password must be at least 6 characters." });
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            res.status(400).json({ message: "Enter a valid email address." });
            return;
        }
        // Check duplicate
        const existing = yield user_1.default.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            if (existing.isVerified) {
                res.status(409).json({ message: "An account with this email already exists." });
            }
            else {
                // Account exists but unverified — resend OTP
                const { plain, hash } = yield (0, OtpService_1.generateOtp)();
                existing.otp = { code: hash, expiresAt: (0, OtpService_1.otpExpiresAt)(), purpose: "verify" };
                yield existing.save();
                yield (0, EmailService_1.sendVerificationOtp)({ to: existing.email, name: existing.displayName, otp: plain });
                res.status(200).json({
                    message: "Account already exists but is unverified. A new code has been sent.",
                    email: existing.email,
                });
            }
            return;
        }
        // Hash password
        const passwordHash = yield bcrypt_1.default.hash(password, 12);
        // Generate OTP
        const { plain, hash } = yield (0, OtpService_1.generateOtp)();
        // Create user
        const user = yield user_1.default.create({
            displayName: displayName.trim(),
            email: email.toLowerCase().trim(),
            passwordHash,
            otp: {
                code: hash,
                expiresAt: (0, OtpService_1.otpExpiresAt)(),
                purpose: "verify",
            },
        });
        // Send verification OTP email
        yield (0, EmailService_1.sendVerificationOtp)({ to: user.email, name: user.displayName, otp: plain });
        res.status(201).json({
            message: "Account created. Check your email for the 6-digit verification code.",
            email: user.email,
        });
    }
    catch (error) {
        console.error("Signup error:", error.message);
        res.status(500).json({ message: error.message });
    }
}));
// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post("/verify-otp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            res.status(400).json({ message: "Email and OTP code are required." });
            return;
        }
        const user = yield user_1.default.findOne({ email: email.toLowerCase().trim() });
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
        const { valid, reason } = yield (0, OtpService_1.verifyOtp)({
            plain: otp.trim(),
            hash: user.otp.code,
            expiresAt: user.otp.expiresAt,
        });
        if (!valid) {
            res.status(400).json({ message: reason });
            return;
        }
        // Mark verified and clear OTP
        user.isVerified = true;
        user.otp = { code: null, expiresAt: null, purpose: null };
        yield user.save();
        // Send two emails: verified confirmation + welcome
        yield (0, EmailService_1.sendVerifiedConfirmation)({ to: user.email, name: user.displayName });
        yield (0, EmailService_1.sendWelcomeEmail)({ to: user.email, name: user.displayName });
        res.status(200).json({
            message: "Email verified! You can now log in.",
        });
    }
    catch (error) {
        console.error("Verify OTP error:", error.message);
        res.status(500).json({ message: "Verification failed. Please try again." });
    }
}));
// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
// Resends a fresh OTP for either "verify" or "reset" purpose
router.post("/resend-otp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, purpose } = req.body;
        if (!email) {
            res.status(400).json({ message: "Email is required." });
            return;
        }
        if (!purpose) {
            res.status(400).json({ message: "Purpose is required." });
            return;
        }
        const user = yield user_1.default.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            // Don't reveal whether the email exists — security best practice
            res.status(200).json({ message: "If that email exists, a new code has been sent." });
            return;
        }
        if (purpose === "verify" && user.isVerified) {
            res.status(400).json({ message: "This account is already verified." });
            return;
        }
        const { plain, hash } = yield (0, OtpService_1.generateOtp)();
        user.otp = { code: hash, expiresAt: (0, OtpService_1.otpExpiresAt)(), purpose };
        yield user.save();
        if (purpose === "verify") {
            yield (0, EmailService_1.sendVerificationOtp)({ to: user.email, name: user.displayName, otp: plain });
        }
        else {
            yield (0, EmailService_1.sendPasswordResetOtp)({ to: user.email, name: user.displayName, otp: plain });
        }
        res.status(200).json({ message: "A new code has been sent to your email." });
    }
    catch (error) {
        console.error("Resend OTP error:", error.message);
        res.status(500).json({ message: "Failed to resend code. Please try again." });
    }
}));
// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required." });
            return;
        }
        const user = yield user_1.default.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            res.status(401).json({ message: "Invalid email or password." });
            return;
        }
        if (!user.isVerified) {
            res.status(403).json({
                message: "Please verify your email before logging in.",
                needsVerify: true,
                email: user.email,
            });
            return;
        }
        const valid = yield user.comparePassword(password);
        if (!valid) {
            res.status(401).json({ message: "Invalid email or password." });
            return;
        }
        // Sign JWT and set cookie
        const token = (0, TokenService_1.signToken)({
            userId: user._id.toString(),
            email: user.email,
            isAdmin: user.isAdmin,
        });
        setTokenCookie(res, token);
        res.status(200).json({
            message: "Logged in successfully.",
            user: sanitize(user),
        });
    }
    catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Login failed. Please try again." });
    }
}));
// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", (_req, res) => {
    res.clearCookie("sf_token", { path: "/" });
    res.status(200).json({ message: "Logged out." });
});
// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post("/forgot-password", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: "Email is required." });
            return;
        }
        const user = yield user_1.default.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            // Don't reveal whether the email exists
            res.status(200).json({ message: "If that email exists, a reset code has been sent." });
            return;
        }
        const { plain, hash } = yield (0, OtpService_1.generateOtp)();
        user.otp = { code: hash, expiresAt: (0, OtpService_1.otpExpiresAt)(), purpose: "reset" };
        yield user.save();
        yield (0, EmailService_1.sendPasswordResetOtp)({ to: user.email, name: user.displayName, otp: plain });
        res.status(200).json({
            message: "A 6-digit reset code has been sent to your email.",
            email: user.email,
        });
    }
    catch (error) {
        console.error("Forgot password error:", error.message);
        res.status(500).json({ message: "Failed to send reset code. Please try again." });
    }
}));
// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post("/reset-password", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            res.status(400).json({ message: "Email, OTP code and new password are required." });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ message: "Password must be at least 6 characters." });
            return;
        }
        const user = yield user_1.default.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            res.status(404).json({ message: "Account not found." });
            return;
        }
        if (user.otp.purpose !== "reset") {
            res.status(400).json({ message: "No reset code found. Please request a new one." });
            return;
        }
        const { valid, reason } = yield (0, OtpService_1.verifyOtp)({
            plain: otp.trim(),
            hash: user.otp.code,
            expiresAt: user.otp.expiresAt,
        });
        if (!valid) {
            res.status(400).json({ message: reason });
            return;
        }
        // Set new password and clear OTP
        user.passwordHash = yield bcrypt_1.default.hash(newPassword, 12);
        user.otp = { code: null, expiresAt: null, purpose: null };
        yield user.save();
        yield (0, EmailService_1.sendPasswordChangedEmail)({ to: user.email, name: user.displayName });
        res.status(200).json({ message: "Password reset successfully. You can now log in." });
    }
    catch (error) {
        console.error("Reset password error:", error.message);
        res.status(500).json({ message: "Failed to reset password. Please try again." });
    }
}));
// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", Auth_1.protect, (req, res) => {
    res.status(200).json({ user: sanitize(req.user) });
});
// ── PATCH /api/auth/profile ───────────────────────────────────────────────────
router.patch("/profile", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { displayName, classLevel, subjects, emailPreferences } = req.body;
        const user = req.user;
        if (displayName)
            user.displayName = displayName.trim();
        if (classLevel !== undefined)
            user.classLevel = classLevel;
        if (subjects)
            user.subjects = subjects;
        if (emailPreferences)
            Object.assign(user.emailPreferences, emailPreferences);
        yield user.save();
        res.status(200).json({ message: "Profile updated.", user: sanitize(user) });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to update profile." });
    }
}));
// ── POST /api/auth/change-password ───────────────────────────────────────────
// For logged-in users changing their password from Settings
router.post("/change-password", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: "Current and new passwords are required." });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ message: "New password must be at least 6 characters." });
            return;
        }
        const user = req.user;
        const valid = yield user.comparePassword(currentPassword);
        if (!valid) {
            res.status(401).json({ message: "Current password is incorrect." });
            return;
        }
        user.passwordHash = yield bcrypt_1.default.hash(newPassword, 12);
        yield user.save();
        yield (0, EmailService_1.sendPasswordChangedEmail)({ to: user.email, name: user.displayName });
        // Clear the session cookie — user must log in again with new password
        res.clearCookie("sf_token", { path: "/" });
        res.status(200).json({
            message: "Password changed successfully. Please log in with your new password.",
        });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to change password." });
    }
}));
exports.default = router;
