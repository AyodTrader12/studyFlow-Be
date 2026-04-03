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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderCron = startReminderCron;
exports.startInactivityCron = startInactivityCron;
// src/services/reminderCron.ts
const node_cron_1 = __importDefault(require("node-cron"));
const Reminder_1 = __importDefault(require("../models/Reminder"));
const user_1 = __importDefault(require("../models/user"));
const EmailService_1 = require("../services/EmailService");
// Helper function to pad numbers with leading zeros
function pad(num) {
    return num.toString().padStart(2, "0");
}
// ── Reminder cron — runs every minute ─────────────────────────────────────────
function startReminderCron() {
    node_cron_1.default.schedule("* * * * *", () => __awaiter(this, void 0, void 0, function* () {
        try {
            const now = new Date();
            const today = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
            const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
            const dueReminders = yield Reminder_1.default.find({
                date: today,
                time: nowTime,
                emailSent: false,
            });
            if (dueReminders.length === 0)
                return;
            console.log(`⏰ Processing ${dueReminders.length} reminder(s)...`);
            for (const reminder of dueReminders) {
                const user = yield user_1.default.findById(reminder.userId);
                if (!user || !user.emailPreferences.reminderEmails)
                    continue;
                yield (0, EmailService_1.sendReminderEmail)({
                    to: user.email,
                    name: user.displayName,
                    reminderText: reminder.text,
                    date: reminder.date,
                });
                reminder.emailSent = true;
                reminder.sentAt = new Date();
                yield reminder.save();
                console.log(`✅ Reminder sent to ${user.email}: "${reminder.text}"`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown";
            console.error(`Reminder cron error: ${message}`);
        }
    }));
    console.log("⏰ Reminder cron started (runs every minute)");
}
// ── Inactivity cron — runs daily at 9:00 AM ───────────────────────────────────
function startInactivityCron() {
    node_cron_1.default.schedule("0 9 * * *", () => __awaiter(this, void 0, void 0, function* () {
        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const inactiveUsers = yield user_1.default.find({
                "streak.lastStudied": { $lt: threeDaysAgo },
                "emailPreferences.inactivityNudge": true,
            });
            console.log(`💤 Checking inactivity — ${inactiveUsers.length} inactive user(s)`);
            for (const user of inactiveUsers) {
                if (!user.streak.lastStudied)
                    continue;
                const daysSince = Math.floor((Date.now() - user.streak.lastStudied.getTime()) / (1000 * 60 * 60 * 24));
                yield (0, EmailService_1.sendInactivityEmail)({
                    to: user.email,
                    name: user.displayName,
                    daysSinceLastStudy: daysSince,
                });
                console.log(`📧 Inactivity email sent to ${user.email} (${daysSince} days inactive)`);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown";
            console.error(`Inactivity cron error: ${message}`);
        }
    }));
    console.log("💤 Inactivity cron started (runs daily at 9:00 AM)");
}
// function pad(n: number): string {
//   return String(n).padStart(2, "0");
// }
