// src/models/PastQuestion.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export type ExamBody =
  | "JAMB"
  | "WAEC"
  | "NECO"
  | "GCE"
  | "Junior WAEC"
  | "Common Entrance"
  | "Other";

export interface IPastQuestion {
  examBody:    ExamBody;
  subject:     string;
  year:        number;
  title:       string;
  description: string;
  fileUrl:     string;       // PDF URL
  thumbnail:   string;
  totalMarks:  number;
  duration:    string;       // e.g. "2 hours"
  level:       string;       // "JSS" | "SS" | "University"
  views:       number;
  addedBy:     string;
  isPublished: boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

export interface IPastQuestionDocument extends IPastQuestion, Document {
  _id: Types.ObjectId;
}

const PastQuestionSchema = new Schema<IPastQuestionDocument>(
  {
    examBody: {
      type:     String,
      required: true,
      enum:     ["JAMB", "WAEC", "NECO", "GCE", "Junior WAEC", "Common Entrance", "Other"],
      index:    true,
    },
    subject:     { type: String, required: true, trim: true, index: true },
    year:        { type: Number, required: true, index: true },
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    fileUrl:     { type: String, required: true },
    thumbnail:   { type: String, default: "" },
    totalMarks:  { type: Number, default: 0 },
    duration:    { type: String, default: "" },
    level:       {
      type:    String,
      enum:    ["JSS", "SS", "University"],
      default: "SS",
    },
    views:       { type: Number, default: 0 },
    addedBy:     { type: String, default: "admin" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index so queries like "WAEC Chemistry" are fast
PastQuestionSchema.index({ examBody: 1, subject: 1, year: -1 });

export default mongoose.model<IPastQuestionDocument>(
  "PastQuestion",
  PastQuestionSchema
);