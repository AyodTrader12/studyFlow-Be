// src/models/Summary.ts
import mongoose, { Schema } from "mongoose";
import type { ISummaryDocument } from "../types/index.js";

const SummarySchema = new Schema<ISummaryDocument>(
  {
    resourceId:    { type: Schema.Types.ObjectId, ref: "Resource", required: true, unique: true },
    summary:       { type: String, required: true },
    keyPoints:     [{ type: String }],
    examQuestions: [{ type: String }],
    generatedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ISummaryDocument>("Summary", SummarySchema);