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
// src/models/PastQuestion.ts
const mongoose_1 = __importStar(require("mongoose"));
const PastQuestionSchema = new mongoose_1.Schema({
    examBody: {
        type: String,
        required: true,
        enum: ["JAMB", "WAEC", "NECO", "GCE", "Junior WAEC", "Common Entrance", "Other"],
        index: true,
    },
    subject: { type: String, required: true, trim: true, index: true },
    year: { type: Number, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    fileUrl: { type: String, required: true },
    thumbnail: { type: String, default: "" },
    totalMarks: { type: Number, default: 0 },
    duration: { type: String, default: "" },
    level: {
        type: String,
        enum: ["JSS", "SS", "University"],
        default: "SS",
    },
    views: { type: Number, default: 0 },
    addedBy: { type: String, default: "admin" },
    isPublished: { type: Boolean, default: true },
}, { timestamps: true });
// Compound index so queries like "WAEC Chemistry" are fast
PastQuestionSchema.index({ examBody: 1, subject: 1, year: -1 });
exports.default = mongoose_1.default.model("PastQuestion", PastQuestionSchema);
