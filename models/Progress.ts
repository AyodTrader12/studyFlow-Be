// src/models/Progress.ts
import mongoose, { Schema } from "mongoose";
import type { IProgressDocument } from "../types/index.js";

const ProgressSchema = new Schema<IProgressDocument>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: "User",     required: true },
    resourceId:  { type: Schema.Types.ObjectId, ref: "Resource", required: true },
    subject:     { type: String, required: true },
    level:       { type: String, required: true },
    completedAt: { type: Date,   default: Date.now },
    timeSpent:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProgressSchema.index({ userId: 1, resourceId: 1 }, { unique: true });
ProgressSchema.index({ userId: 1, subject: 1 });

export default mongoose.model<IProgressDocument>("Progress", ProgressSchema);