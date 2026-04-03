"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = require("express");
const Auth_1 = require("../middleware/Auth");
const EmailService_1 = require("../services/EmailService");
const router = (0, express_1.Router)();
function sanitizeUser(user) {
    return {
        id: user._id, firebaseUid: user.firebaseUid, email: user.email,
        displayName: user.displayName, photoURL: user.photoURL, isAdmin: user.isAdmin,
        isVerified: user.isVerified, classLevel: user.classLevel, subjects: user.subjects,
        streak: user.streak, totalResourcesViewed: user.totalResourcesViewed,
        totalBookmarks: user.totalBookmarks, emailPreferences: user.emailPreferences,
        createdAt: user.createdAt,
    };
}
router.post("/sync", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classLevel, subjects } = req.body;
        const user = req.user;
        let isNewUser = false;
        if (classLevel)
            user.classLevel = classLevel;
        if (subjects)
            user.subjects = subjects;
        if (!user.emailPreferences.welcomeSent) {
            yield (0, EmailService_1.sendWelcomeEmail)({ to: user.email, name: user.displayName });
            user.emailPreferences.welcomeSent = true;
            isNewUser = true;
        }
        yield user.save();
        res.status(200).json({ message: isNewUser ? "Account synced and welcome email sent." : "Account synced.", user: sanitizeUser(user) });
    }
    catch (error) {
        console.error("Auth sync error:", error.message);
        res.status(500).json({ message: "Failed to sync account." });
    }
}));
router.post("/verify-email", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user.isVerified) {
            user.isVerified = true;
            yield user.save();
            yield (0, EmailService_1.sendEmailVerifiedConfirmation)({ to: user.email, name: user.displayName });
        }
        res.status(200).json({ message: "Email verified.", user: sanitizeUser(user) });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to confirm email verification." });
    }
}));
router.get("/me", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({ user: sanitizeUser(req.user) });
}));
router.patch("/profile", Auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { displayName, classLevel, subjects, emailPreferences } = req.body;
        const user = req.user;
        if (displayName)
            user.displayName = displayName;
        if (classLevel)
            user.classLevel = classLevel;
        if (subjects)
            user.subjects = subjects;
        if (emailPreferences)
            Object.assign(user.emailPreferences, emailPreferences);
        yield user.save();
        res.status(200).json({ message: "Profile updated.", user: sanitizeUser(user) });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to update profile." });
    }
}));
exports.default = router;
