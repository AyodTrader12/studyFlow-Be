// src/models/Bookmark.ts
import mongoose, { Schema } from "mongoose";
import type { IBookmarkDocument } from "../types/index.js";

const BookmarkSchema = new Schema<IBookmarkDocument>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User",     required: true },
    resourceId: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
  },
  { timestamps: true }
);

BookmarkSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

export default mongoose.model<IBookmarkDocument>("Bookmark", BookmarkSchema);