"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const dbConfig_1 = require("./utils/dbConfig");
const ReminderCron_1 = require("./services/ReminderCron");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
// src/config/db.ts
// src/index.ts
const app = (0, express_1.default)();
const PORT = parseInt((_a = process.env.PORT) !== null && _a !== void 0 ? _a : "5000", 10);
// ── Security ──────────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (_b = process.env.CLIENT_URL) !== null && _b !== void 0 ? _b : "http://localhost:5173",
    credentials: true,
}));
// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    message: { message: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Stricter limit for Gemini calls — expensive API
const summaryLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 min
    max: 5,
    message: { message: "Too many AI requests. Please wait a moment." },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api", globalLimiter);
app.use("/api/summaries", summaryLimiter);
// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: "2mb" })); // 2mb to support notes content
app.use(express_1.default.urlencoded({ extended: true }));
// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "StudyFlow API",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});
// // ── Routes ────────────────────────────────────────────────────────────────────
// app.use("/api/auth",      authRoutes);
// app.use("/api/resources", resourceRoutes);
// app.use("/api/bookmarks", bookmarkRoutes);
// app.use("/api/progress",  progressRoutes);
// app.use("/api/reminders", reminderRoutes);
// app.use("/api/summaries", summaryRoutes);
// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});
// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ message: "Something went wrong. Please try again." });
});
// ── Bootstrap ─────────────────────────────────────────────────────────────────
function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, dbConfig_1.connectDB)();
        app.listen(PORT, () => {
            var _a, _b;
            console.log(`\n🚀 StudyFlow API running on http://localhost:${PORT}`);
            console.log(`📚 Environment : ${(_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : "development"}`);
            console.log(`🔗 Client URL  : ${(_b = process.env.CLIENT_URL) !== null && _b !== void 0 ? _b : "http://localhost:5173"}\n`);
        });
        (0, ReminderCron_1.startReminderCron)();
        // startInactivityCron();
    });
}
bootstrap().catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
});
