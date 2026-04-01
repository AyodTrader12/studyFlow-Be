// src/models/Reminder.ts
import mongoose, { Schema } from "mongoose";
import type { IReminderDocument } from "../types/index.js";

const ReminderSchema = new Schema<IReminderDocument>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    text:      { type: String, required: true, trim: true },
    date:      { type: String, required: true },
    time:      { type: String, default: "08:00" },
    emailSent: { type: Boolean, default: false },
    sentAt:    { type: Date,    default: null },
  },
  { timestamps: true }
);

ReminderSchema.index({ date: 1, emailSent: 1 });

export default mongoose.model<IReminderDocument>("Reminder", ReminderSchema);