"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    photoURL: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    classLevel: {
        type: String,
        enum: ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", ""],
        default: "",
    },
    subjects: [{ type: String }],
    streak: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastStudied: { type: Date, default: null },
    },
    totalResourcesViewed: { type: Number, default: 0 },
    totalBookmarks: { type: Number, default: 0 },
    emailPreferences: {
        welcomeSent: { type: Boolean, default: false },
        weeklyDigest: { type: Boolean, default: true },
        streakMilestones: { type: Boolean, default: true },
        inactivityNudge: { type: Boolean, default: true },
        reminderEmails: { type: Boolean, default: true },
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model("User", UserSchema);
