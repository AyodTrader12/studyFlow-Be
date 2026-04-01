import mongoose,{ Schema } from "mongoose";
import type { IUserDocument } from "../types/index";

const UserSchema = new Schema<IUserDocument>(
  {
    firebaseUid:  { type: String, required: true, unique: true, index: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName:  { type: String, required: true, trim: true },
    photoURL:     { type: String, default: "" },
    isAdmin:      { type: Boolean, default: false },
    isVerified:   { type: Boolean, default: false },
 
    classLevel: {
      type: String,
      enum: ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3", ""],
      default: "",
    },
    subjects: [{ type: String }],
 
    streak: {
      current:     { type: Number, default: 0 },
      longest:     { type: Number, default: 0 },
      lastStudied: { type: Date,   default: null },
    },
 
    totalResourcesViewed: { type: Number, default: 0 },
    totalBookmarks:       { type: Number, default: 0 },
 
    emailPreferences: {
      welcomeSent:      { type: Boolean, default: false },
      weeklyDigest:     { type: Boolean, default: true },
      streakMilestones: { type: Boolean, default: true },
      inactivityNudge:  { type: Boolean, default: true },
      reminderEmails:   { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);
 
export default mongoose.model<IUserDocument>("User", UserSchema);