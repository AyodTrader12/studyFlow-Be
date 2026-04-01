// src/models/Resource.ts
import mongoose, { Schema } from "mongoose";
import type { IResourceDocument } from "../types/index";

const ResourceSchema = new Schema<IResourceDocument>(
  {
    title:       { type: String, required: true, trim: true },
    subject:     { type: String, required: true, trim: true, index: true },
    topic:       { type: String, default: "",    trim: true },
    description: { type: String, default: "",    trim: true },

    type: {
      type:     String,
      enum:     ["youtube", "pdf", "notes", "article"],
      required: true,
    },

    level: {
      type:     String,
      enum:     ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", "All Levels"],
      required: true,
    },

    url:       { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    duration:  { type: String, default: "" },
    content:   { type: String, default: "" },

    youtubeData: {
      videoId:      { type: String, default: "" },
      channelTitle: { type: String, default: "" },
      viewCount:    { type: String, default: "" },
    },

    views:       { type: Number, default: 0 },
    bookmarks:   { type: Number, default: 0 },
    avgRating:   { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    addedBy:     { type: String, default: "admin" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ResourceSchema.index({ title: "text", topic: "text", subject: "text", description: "text" });

export default mongoose.model<IResourceDocument>("Resource", ResourceSchema);