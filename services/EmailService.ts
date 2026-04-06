// src/services/emailService.ts
// All email templates sent via Resend.
// Welcome email now carries the Firebase verification link.
// Password changed email added.

import { resend, FROM } from "../utils/Resend";
import type {
  WelcomeEmailParams,
  ReminderEmailParams,
  StreakEmailParams,
  InactivityEmailParams,
} from "../types/index";

const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const YEAR = new Date().getFullYear();

// ── Shared layout ─────────────────────────────────────────────────────────────
function layout(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f3fa;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f3fa;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
  <tr>
    <td style="background:#1a2a5e;padding:28px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">📚 StudyFlow</h1>
      <p style="margin:6px 0 0;color:#93aad4;font-size:12px;">Learn Smarter. Study Better.</p>
    </td>
  </tr>
  <tr><td style="padding:36px 40px 28px;">${content}</td></tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        © ${YEAR} StudyFlow. All rights reserved.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── Button helper ─────────────────────────────────────────────────────────────
function btn(href: string, label: string, color = "#1a2a5e"): string {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${href}"
       style="display:inline-block;background:${color};color:#fff;text-decoration:none;
              padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
      ${label}
    </a>
  </div>`;
}

// ── 1. Welcome + verification email ──────────────────────────────────────────
// verificationLink comes from Firebase Admin: auth.generateEmailVerificationLink()
export async function sendWelcomeEmail({
  to,
  name,
  verificationLink,
}: WelcomeEmailParams & { verificationLink: string }): Promise<void> {
  const features: [string, string][] = [
    ["📖", "Browse resources by subject and class level"],
    ["🎥", "Watch video lessons inside the app — no redirects"],
    ["📝", "Read detailed study notes with worked examples"],
    ["🔖", "Bookmark resources to revisit later"],
    ["🗓️", "Set study reminders with email notifications"],
    ["🤖", "Get AI summaries of any resource after viewing"],
  ];

  const content = `
    <h2 style="margin:0 0 16px;color:#1a2a5e;font-size:22px;font-weight:700;">
      Welcome to StudyFlow, ${name}! 🎉
    </h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.7;">
      Your account has been created. Before you start studying, please verify your
      email address by clicking the button below.
    </p>

    ${btn(verificationLink, "Verify My Email Address")}

    <p style="margin:16px 0;color:#6b7280;font-size:12px;text-align:center;">
      This verification link expires in <strong>24 hours</strong>.
      If you did not create this account, you can safely ignore this email.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">

    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;font-weight:600;">
      Once verified, here's what you can do:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${features.map(([emoji, text]) => `
      <tr><td style="padding:7px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:28px;font-size:17px;">${emoji}</td>
          <td style="color:#374151;font-size:14px;line-height:1.5;">${text}</td>
        </tr></table>
      </td></tr>`).join("")}
    </table>
  `;

  await resend.emails.send({
    from:    FROM,
    to,
    subject: `Welcome to StudyFlow — please verify your email, ${name}`,
    html:    layout(content),
  });
}

// ── 2. Email verified confirmation ───────────────────────────────────────────
export async function sendEmailVerifiedConfirmation({
  to,
  name,
}: { to: string; name: string }): Promise<void> {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:64px;height:64px;border-radius:50%;background:#dcfce7;
                  margin:0 auto 16px;display:flex;align-items:center;
                  justify-content:center;font-size:32px;">✅</div>
      <h2 style="margin:0;color:#1a2a5e;font-size:22px;">Email Verified!</h2>
    </div>
    <p style="color:#4b5563;font-size:15px;line-height:1.7;text-align:center;">
      Hi ${name}, your email address has been successfully verified.
      Your StudyFlow account is now fully active.
    </p>
    ${btn(`${CLIENT_URL}/dashboard`, "Start Studying →", "#16a34a")}
  `;

  await resend.emails.send({
    from:    FROM,
    to,
    subject: "Your StudyFlow email has been verified ✅",
    html:    layout(content),
  });
}

// ── 3. Password changed notification ─────────────────────────────────────────
export async function sendPasswordChangedEmail({
  to,
  name,
}: { to: string; name: string }): Promise<void> {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:64px;height:64px;border-radius:50%;background:#dbeafe;
                  margin:0 auto 16px;display:flex;align-items:center;
                  justify-content:center;font-size:32px;">🔐</div>
      <h2 style="margin:0;color:#1a2a5e;font-size:20px;">Password Changed Successfully</h2>
    </div>
    <p style="color:#4b5563;font-size:14px;line-height:1.7;">
      Hi ${name}, your StudyFlow password was changed on
      <strong>${new Date().toLocaleDateString("en-NG", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })}</strong>.
    </p>
    <p style="color:#4b5563;font-size:14px;line-height:1.7;">
      If you made this change, no further action is needed.
    </p>

    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.6;">
        ⚠️ <strong>Didn't change your password?</strong> Your account may have been compromised.
        Please <a href="${CLIENT_URL}/forgot-password" style="color:#1a2a5e;font-weight:700;">reset your password immediately</a>
        and contact us.
      </p>
    </div>

    ${btn(`${CLIENT_URL}/dashboard`, "Go to Dashboard")}
  `;

  await resend.emails.send({
    from:    FROM,
    to,
    subject: "Your StudyFlow password has been changed",
    html:    layout(content),
  });
}

// ── 4. Reminder email ─────────────────────────────────────────────────────────
export async function sendReminderEmail({
  to, name, reminderText, date,
}: ReminderEmailParams): Promise<void> {
  const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;">⏰ Study Reminder</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi ${name}, here is your reminder for today:</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;color:#1e40af;font-size:16px;font-weight:600;">${reminderText}</p>
      <p style="margin:8px 0 0;color:#6b7280;font-size:12px;">Scheduled for ${date}</p>
    </div>
    ${btn(`${CLIENT_URL}/dashboard`, "Open Dashboard →")}
  `;

  await resend.emails.send({
    from: FROM, to,
    subject: `⏰ Study Reminder: ${reminderText}`,
    html:    layout(content),
  });
}

// ── 5. Streak milestone email ─────────────────────────────────────────────────
export async function sendStreakMilestoneEmail({
  to, name, streak,
}: StreakEmailParams): Promise<void> {
  const m: Record<number, { emoji: string; title: string; msg: string }> = {
    7:  { emoji: "🔥", title: "7-Day Streak!",  msg: "A whole week of studying — you're on fire!" },
    14: { emoji: "⚡", title: "2-Week Streak!", msg: "Two weeks straight. Your dedication is incredible!" },
    30: { emoji: "🏆", title: "30-Day Streak!", msg: "One full month! You are in the top 1% of students." },
    60: { emoji: "💎", title: "60-Day Streak!", msg: "60 days! You are absolutely unstoppable." },
  };
  const { emoji, title, msg } = m[streak] ?? {
    emoji: "🎉", title: `${streak}-Day Streak!`,
    msg:   "Keep going — consistency is the key to success!",
  };

  const content = `
    <div style="text-align:center;">
      <div style="font-size:52px;margin-bottom:16px;">${emoji}</div>
      <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:22px;">${title}</h2>
      <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">
        Hi ${name}, ${msg}
      </p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;
                  padding:16px;margin-bottom:24px;display:inline-block;">
        <p style="margin:0;color:#ea580c;font-size:28px;font-weight:800;">${streak} days</p>
        <p style="margin:4px 0 0;color:#9a3412;font-size:12px;">consecutive study streak</p>
      </div>
      <br>
      ${btn(`${CLIENT_URL}/dashboard`, "Keep It Going →")}
    </div>
  `;

  await resend.emails.send({
    from: FROM, to,
    subject: `${emoji} You've hit a ${streak}-day study streak on StudyFlow!`,
    html:    layout(content),
  });
}

// ── 6. Inactivity nudge ───────────────────────────────────────────────────────
export async function sendInactivityEmail({
  to, name, daysSinceLastStudy,
}: InactivityEmailParams): Promise<void> {
  const content = `
    <h2 style="margin:0 0 16px;color:#1a2a5e;">Hi ${name}, we miss you! 👋</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.7;">
      It has been <strong>${daysSinceLastStudy} days</strong> since you last studied on StudyFlow.
      Your subjects are waiting!
    </p>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.7;">
      Even 15 minutes a day makes a big difference. Come back and keep your momentum going.
    </p>
    ${btn(`${CLIENT_URL}/dashboard`, "Resume Studying →")}
    <p style="margin:20px 0 0;text-align:center;">
      <a href="${CLIENT_URL}/dashboard/settings" style="color:#9ca3af;font-size:12px;">
        Unsubscribe from these emails
      </a>
    </p>
  `;

  await resend.emails.send({
    from: FROM, to,
    subject: `We miss you, ${name}! Come back to StudyFlow 📚`,
    html:    layout(content),
  });
}