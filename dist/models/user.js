"use strict";
// server/src/models/User.ts
// No Firebase. Auth is handled entirely by MongoDB + bcrypt + JWT.
// OTP fields store the 6-digit code and its expiry for email verification
// and password reset.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserSchema = new mongoose_1.Schema({
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    otp: {
        code: { type: String, default: null },
        expiresAt: { type: Date, default: null },
        purpose: { type: String, enum: ["verify", "reset", null], default: null },
    },
    isAdmin: { type: Boolean, default: false },
    classLevel: { type: String, enum: ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", ""], default: "" },
    subjects: [{ type: String }],
    photoURL: { type: String, default: "" },
    streak: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastStudied: { type: Date, default: null },
    },
    totalResourcesViewed: { type: Number, default: 0 },
    totalBookmarks: { type: Number, default: 0 },
    emailPreferences: {
        weeklyDigest: { type: Boolean, default: true },
        streakMilestones: { type: Boolean, default: true },
        inactivityNudge: { type: Boolean, default: true },
        reminderEmails: { type: Boolean, default: true },
    },
}, { timestamps: true });
// Instance method to compare passwords without exposing the hash
UserSchema.methods.comparePassword = function (plain) {
    return __awaiter(this, void 0, void 0, function* () {
        return bcrypt_1.default.compare(plain, this.passwordHash);
    });
};
exports.default = mongoose_1.default.model("User", UserSchema);
