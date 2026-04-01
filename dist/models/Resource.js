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
// src/models/Resource.ts
const mongoose_1 = __importStar(require("mongoose"));
const ResourceSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    topic: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    type: {
        type: String,
        enum: ["youtube", "pdf", "notes", "article"],
        required: true,
    },
    level: {
        type: String,
        enum: ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "All Levels"],
        required: true,
    },
    url: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    duration: { type: String, default: "" },
    content: { type: String, default: "" },
    youtubeData: {
        videoId: { type: String, default: "" },
        channelTitle: { type: String, default: "" },
        viewCount: { type: String, default: "" },
    },
    views: { type: Number, default: 0 },
    bookmarks: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    addedBy: { type: String, default: "admin" },
    isPublished: { type: Boolean, default: true },
}, { timestamps: true });
ResourceSchema.index({ title: "text", topic: "text", subject: "text", description: "text" });
exports.default = mongoose_1.default.model("Resource", ResourceSchema);
