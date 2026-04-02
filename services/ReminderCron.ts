// src/services/reminderCron.ts
import cron from "node-cron";
import Reminder from "../models/Reminder.js";
import User from "../models/user.js";
import {
  sendReminderEmail,
  sendInactivityEmail,
} from "../services/EmailService.js";

// Helper function to pad numbers with leading zeros
function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

// ── Reminder cron — runs every minute ─────────────────────────────────────────
export function startReminderCron(): void {
  cron.schedule("* * * * *", async () => {
    try {
      const now     = new Date();
      const today   = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const dueReminders = await Reminder.find({
        date:      today,
        time:      nowTime,
        emailSent: false,
      });

      if (dueReminders.length === 0) return;

      console.log(`⏰ Processing ${dueReminders.length} reminder(s)...`);

      for (const reminder of dueReminders) {
        const user = await User.findById(reminder.userId);
        if (!user || !user.emailPreferences.reminderEmails) continue;

        await sendReminderEmail({
          to:           user.email,
          name:         user.displayName,
          reminderText: reminder.text,
          date:         reminder.date,
        });

        reminder.emailSent = true;
        reminder.sentAt    = new Date();
        await reminder.save();

        console.log(`✅ Reminder sent to ${user.email}: "${reminder.text}"`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown";
      console.error(`Reminder cron error: ${message}`);
    }
  });

  console.log("⏰ Reminder cron started (runs every minute)");
}

// ── Inactivity cron — runs daily at 9:00 AM ───────────────────────────────────
export function startInactivityCron(): void {
  cron.schedule("0 9 * * *", async () => {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      const inactiveUsers = await User.find({
        "streak.lastStudied":          { $lt: threeDaysAgo },
        "emailPreferences.inactivityNudge": true,
      });

      console.log(`💤 Checking inactivity — ${inactiveUsers.length} inactive user(s)`);

      for (const user of inactiveUsers) {
        if (!user.streak.lastStudied) continue;

        const daysSince = Math.floor(
          (Date.now() - user.streak.lastStudied.getTime()) / (1000 * 60 * 60 * 24)
        );

        await sendInactivityEmail({
          to:                 user.email,
          name:               user.displayName,
          daysSinceLastStudy: daysSince,
        });

        console.log(`📧 Inactivity email sent to ${user.email} (${daysSince} days inactive)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown";
      console.error(`Inactivity cron error: ${message}`);
    }
  });

  console.log("💤 Inactivity cron started (runs daily at 9:00 AM)");
}

// function pad(n: number): string {
//   return String(n).padStart(2, "0");
// }