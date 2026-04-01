// src/types/index.ts
// Shared TypeScript interfaces used across the entire backend

import { Request } from "express";
import { Document, Types } from "mongoose";

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface DecodedFirebaseToken {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  iat: number;
  exp: number;
}

// Extends Express Request with authenticated user data
export interface AuthRequest extends Request {
  firebaseUser?: DecodedFirebaseToken;
  user?: IUserDocument;
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface IStreak {
  current: number;
  longest: number;
  lastStudied: Date | null;
}

export interface IEmailPreferences {
  welcomeSent: boolean;
  weeklyDigest: boolean;
  streakMilestones: boolean;
  inactivityNudge: boolean;
  reminderEmails: boolean;
}

export interface IUser {
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
  isVerified: boolean;
  classLevel: string;
  subjects: string[];
  streak: IStreak;
  totalResourcesViewed: number;
  totalBookmarks: number;
  emailPreferences: IEmailPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
}

// ── Resource ──────────────────────────────────────────────────────────────────

export type ResourceType = "youtube" | "pdf" | "notes" | "article";
export type ClassLevel = "JSS1" | "JSS2" | "JSS3" | "SS1" | "SS2" | "SS3" | "All Levels";

export interface IYouTubeData {
  videoId: string;
  channelTitle: string;
  viewCount: string;
}

export interface IResource {
  title: string;
  subject: string;
  topic: string;
  description: string;
  type: ResourceType;
  level: ClassLevel;
  url: string;
  thumbnail: string;
  duration: string;
  content: string;
  youtubeData: IYouTubeData;
  views: number;
  bookmarks: number;
  avgRating: number;
  ratingCount: number;
  addedBy: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResourceDocument extends IResource, Document {
  _id: Types.ObjectId;
}

// ── Bookmark ──────────────────────────────────────────────────────────────────

export interface IBookmark {
  userId: Types.ObjectId;
  resourceId: Types.ObjectId;
  createdAt: Date;
}

export interface IBookmarkDocument extends IBookmark, Document {
  _id: Types.ObjectId;
}

// ── Progress ──────────────────────────────────────────────────────────────────

export interface IProgress {
  userId: Types.ObjectId;
  resourceId: Types.ObjectId;
  subject: string;
  level: string;
  completedAt: Date;
  timeSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProgressDocument extends IProgress, Document {
  _id: Types.ObjectId;
}

// ── Reminder ──────────────────────────────────────────────────────────────────

export interface IReminder {
  userId: Types.ObjectId;
  text: string;
  date: string;
  time: string;
  emailSent: boolean;
  sentAt: Date | null;
  createdAt: Date;
}

export interface IReminderDocument extends IReminder, Document {
  _id: Types.ObjectId;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface ISummary {
  resourceId: Types.ObjectId;
  summary: string;
  keyPoints: string[];
  examQuestions: string[];
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISummaryDocument extends ISummary, Document {
  _id: Types.ObjectId;
}

// ── Rating ────────────────────────────────────────────────────────────────────

export interface IRating {
  userId: Types.ObjectId;
  resourceId: Types.ObjectId;
  rating: number;
  review: string;
  createdAt: Date;
}

export interface IRatingDocument extends IRating, Document {
  _id: Types.ObjectId;
}

// ── Email Service ─────────────────────────────────────────────────────────────

export interface WelcomeEmailParams {
  to: string;
  name: string;
}

export interface ReminderEmailParams {
  to: string;
  name: string;
  reminderText: string;
  date: string;
}

export interface StreakEmailParams {
  to: string;
  name: string;
  streak: number;
}

export interface InactivityEmailParams {
  to: string;
  name: string;
  daysSinceLastStudy: number;
}

// ── YouTube Service ────────────────────────────────────────────────────────────

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
  viewCount: string;
  url: string;
}

// ── Gemini Service ─────────────────────────────────────────────────────────────

export interface GenerateSummaryParams {
  resourceId: Types.ObjectId;
  title: string;
  subject: string;
  level: string;
  type: ResourceType;
  content?: string;
  url?: string;
}

export interface GeminiSummaryResponse {
  summary: string;
  keyPoints: string[];
  examQuestions: string[];
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = undefined> {
  message: string;
  data?: T;
}

// ── Query Params ──────────────────────────────────────────────────────────────

export interface ResourceQueryParams {
  subject?: string;
  level?: string;
  type?: string;
  search?: string;
  page?: string;
  limit?: string;
}