// server/src/models/User.ts
// No Firebase. Auth is handled entirely by MongoDB + bcrypt + JWT.
// OTP fields store the 6-digit code and its expiry for email verification
// and password reset.

import mongoose, { Schema, Document, Types } from "mongoose";
import * as bcrypt from "bcrypt";
// import type { IUserDocument } from "../types";

export interface IUser {
  // Core identity
  // __v: number; // Mongoose version key
  displayName:  string;
  email:        string;
  passwordHash: string;

  // Verification
  isVerified:   boolean;
  otp: {
    code:      string | null;  // hashed 6-digit code stored in DB
    expiresAt: Date   | null;  // OTP expires after 10 minutes
    purpose:   "verify" | "reset" | null; // which flow is this OTP for
  };

  // Role
  isAdmin: boolean;

  // Study profile
  classLevel: string;
  subjects:   string[];
  photoURL:   string;

  // Streak
  streak: {
    current:     number;
    longest:     number;
    lastStudied: Date | null;
  };

  // Stats
  totalResourcesViewed: number;
  totalBookmarks:       number;

  // Email preferences
  emailPreferences: {
    weeklyDigest:     boolean;
    streakMilestones: boolean;
    inactivityNudge:  boolean;
    reminderEmails:   boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
  __v: number;
  // Instance method — compare a plain password to the stored hash
  comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    displayName:  { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },

    isVerified: { type: Boolean, default: false },

    otp: {
      code:      { type: String,  default: null },
      expiresAt: { type: Date,    default: null },
      purpose:   { type: String,  enum: ["verify", "reset", null], default: null },
    },

    isAdmin: { type: Boolean, default: false },

    classLevel: { type: String, enum: ["JSS1","JSS2","JSS3","SS1","SS2","SS3",""], default: "" },
    subjects:   [{ type: String }],
    photoURL:   { type: String, default: "" },

    streak: {
      current:     { type: Number, default: 0 },
      longest:     { type: Number, default: 0 },
      lastStudied: { type: Date,   default: null },
    },

    totalResourcesViewed: { type: Number, default: 0 },
    totalBookmarks:       { type: Number, default: 0 },

    emailPreferences: {
      weeklyDigest:     { type: Boolean, default: true },
      streakMilestones: { type: Boolean, default: true },
      inactivityNudge:  { type: Boolean, default: true },
      reminderEmails:   { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Instance method to compare passwords without exposing the hash
UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model<IUserDocument>("User", UserSchema);