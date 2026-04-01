// src/models/Rating.ts
import mongoose, { Schema } from "mongoose";
import type { IRatingDocument } from "../types/index.js";

const RatingSchema = new Schema<IRatingDocument>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User",     required: true },
    resourceId: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    review:     { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

RatingSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

export default mongoose.model<IRatingDocument>("Rating", RatingSchema);