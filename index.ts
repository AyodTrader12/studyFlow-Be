import express, { Application,Request, Response, NextFunction } from "express"
import cors from "cors"
import dotenv from "dotenv"
import { connectDB } from "./utils/dbConfig"
import { startReminderCron,startInactivityCron } from "./services/ReminderCron"
import authRoutes from "./controller/Auth";
import resourceRoutes from "./controller/Resource";
import bookmarkRoutes from "./controller/Bookmarks";
import progressRoutes from "./controller/Progress";
import reminderRoutes from "./controller/Reminders";
import summaryRoutes from "./controller/Summaries";
import AdminRoutes from "./controller/Admin";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
// import PastQuestionRoutes from "./controller/pastQuestion"
import aiRoutes from "./controller/ai";
dotenv.config()

// src/config/db.ts
// src/index.ts



const app:Application  = express();
const PORT = parseInt(process.env.PORT ?? "5000", 10);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL ?? "http://localhost:5173",
  credentials: true,
}));
// Change from 'same-origin' to 'same-origin-allow-popups'
// app.use(
//   helmet({
//     crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
//   })
// );
// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      100,
  message:  { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// Stricter limit for Gemini calls — expensive API
const summaryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max:      5,
  message:  { message: "Too many AI requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders:   false,
});


app.use("/api", globalLimiter);
app.use("/api/summaries", summaryLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" })); // 2mb to support notes content
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status:    "ok",
    service:   "StudyFlow API",
    version:   "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// // ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/progress",  progressRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/summaries", summaryRoutes);
app.use("/api/admin",AdminRoutes);
// app.use("/api/past-questions",PastQuestionRoutes);
app.use("/api/ai",             aiRoutes);
// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 StudyFlow API running on http://localhost:${PORT}`);
    console.log(`📚 Environment : ${process.env.NODE_ENV ?? "development"}`);
    console.log(`🔗 Client URL  : ${process.env.CLIENT_URL ?? "http://localhost:5173"}\n`);
  });

  startReminderCron();
  startInactivityCron();
}

bootstrap().catch((err: Error) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});