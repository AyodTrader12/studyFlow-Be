import { resend,FROM } from "../utils/Resend";
import type { WelcomeEmailParams,ReminderEmailParams,StreakEmailParams,InactivityEmailParams } from "../types/index";

 
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const YEAR = new Date().getFullYear();
 
// ── Shared layout wrapper ─────────────────────────────────────────────────────
function layout(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f0f3fa;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f3fa;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
            style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
 
            <!-- Header -->
            <tr>
              <td style="background:#1a2a5e;padding:28px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">📚 StudyFlow</h1>
                <p style="margin:6px 0 0;color:#93aad4;font-size:12px;">Learn Smarter. Study Better.</p>
              </td>
            </tr>
 
            <!-- Content -->
            <tr><td style="padding:36px 40px 28px;">${content}</td></tr>
 
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                  © ${YEAR} StudyFlow. All rights reserved.
                </p>
              </td>
            </tr>
 
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}
 
// ── Welcome Email ─────────────────────────────────────────────────────────────
export async function sendWelcomeEmail({ to, name }: WelcomeEmailParams): Promise<void> {
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
      Welcome, ${name}! 🎉
    </h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.7;">
      Your StudyFlow account is active. You now have free access to hundreds of study resources,
      past questions, and notes — all organised by subject and class level.
    </p>
    <p style="margin:0 0 20px;color:#4b5563;font-size:14px;">Here's what you can do right now:</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${features.map(([emoji, text]) => `
        <tr>
          <td style="padding:7px 0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:28px;font-size:17px;">${emoji}</td>
                <td style="color:#374151;font-size:14px;line-height:1.5;">${text}</td>
              </tr>
            </table>
          </td>
        </tr>`).join("")}
    </table>
    <div style="text-align:center;margin:32px 0 4px;">
      <a href="${CLIENT_URL}/dashboard"
         style="display:inline-block;background:#1a2a5e;color:#ffffff;text-decoration:none;
                padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Go to My Dashboard →
      </a>
    </div>
  `;
 
  await resend.emails.send({
    from:    FROM,
    to,
    subject: `Welcome to StudyFlow, ${name}! 🎓`,
    html:    layout(content),
  });
}
 
// ── Email Verified Confirmation ───────────────────────────────────────────────
export async function sendEmailVerifiedConfirmation({ to, name }: WelcomeEmailParams): Promise<void> {
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:60px;height:60px;border-radius:50%;background:#dcfce7;
                  margin:0 auto 16px;display:inline-flex;align-items:center;
                  justify-content:center;font-size:28px;">✅</div>
      <h2 style="margin:0;color:#1a2a5e;font-size:20px;">Email Verified!</h2>
    </div>
    <p style="color:#4b5563;font-size:14px;line-height:1.7;text-align:center;">
      Hi ${name}, your email has been verified and your account is fully active.
      You can now access all StudyFlow features.
    </p>
    <div style="text-align:center;margin-top:28px;">
      <a href="${CLIENT_URL}/dashboard"
         style="background:#1a2a5e;color:#fff;text-decoration:none;padding:12px 32px;
                border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
        Start Studying →
      </a>
    </div>
  `;
 
  await resend.emails.send({
    from:    FROM,
    to,
    subject: "Your StudyFlow email is verified ✅",
    html:    layout(content),
  });
}
 
// ── Reminder Email ────────────────────────────────────────────────────────────
export async function sendReminderEmail({
  to, name, reminderText, date,
}: ReminderEmailParams): Promise<void> {
  const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;">⏰ Study Reminder</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Hi ${name}, here's your reminder for today:</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;color:#1e40af;font-size:16px;font-weight:600;">${reminderText}</p>
      <p style="margin:8px 0 0;color:#6b7280;font-size:12px;">Scheduled for ${date}</p>
    </div>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.7;">
      Head to your dashboard to access your study resources and get started!
    </p>
    <div style="text-align:center;">
      <a href="${CLIENT_URL}/dashboard"
         style="background:#1a2a5e;color:#fff;text-decoration:none;padding:12px 32px;
                border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
        Open Dashboard →
      </a>
    </div>
  `;
 
  await resend.emails.send({
    from:    FROM,
    to,
    subject: `⏰ Study Reminder: ${reminderText}`,
    html:    layout(content),
  });
}
 
// ── Streak Milestone Email ────────────────────────────────────────────────────
export async function sendStreakMilestoneEmail({
  to, name, streak,
}: StreakEmailParams): Promise<void> {
  const milestones: Record<number, { emoji: string; title: string; msg: string }> = {
    7:  { emoji: "🔥", title: "7-Day Streak!",  msg: "A whole week of studying — you're on fire!" },
    14: { emoji: "⚡", title: "2-Week Streak!", msg: "Two weeks straight. Your dedication is incredible!" },
    30: { emoji: "🏆", title: "30-Day Streak!", msg: "One full month! You're in the top 1% of students." },
    60: { emoji: "💎", title: "60-Day Streak!", msg: "60 days! You are absolutely unstoppable." },
  };
 
  const m = milestones[streak] ?? {
    emoji: "🎉",
    title: `${streak}-Day Streak!`,
    msg:   "Keep going — consistency is the key to success!",
  };
 
  const content = `
    <div style="text-align:center;">
      <div style="font-size:52px;margin-bottom:16px;">${m.emoji}</div>
      <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:22px;">${m.title}</h2>
      <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.7;">${m.msg}</p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;
                  padding:16px;margin-bottom:24px;display:inline-block;">
        <p style="margin:0;color:#ea580c;font-size:28px;font-weight:800;">${streak} days</p>
        <p style="margin:4px 0 0;color:#9a3412;font-size:12px;">consecutive study streak</p>
      </div>
      <br>
      <a href="${CLIENT_URL}/dashboard"
         style="background:#1a2a5e;color:#fff;text-decoration:none;padding:12px 32px;
                border-radius:10px;font-size:14px;font-weight:700;display:inline-block;margin-top:8px;">
        Keep It Going →
      </a>
    </div>
  `;
 
  await resend.emails.send({
    from:    FROM,
    to,
    subject: `${m.emoji} You've hit a ${streak}-day study streak on StudyFlow!`,
    html:    layout(content),
  });
}
 
// ── Inactivity Nudge Email ────────────────────────────────────────────────────
export async function sendInactivityEmail({
  to, name, daysSinceLastStudy,
}: InactivityEmailParams): Promise<void> {
  const content = `
    <h2 style="margin:0 0 16px;color:#1a2a5e;">Hi ${name}, we miss you! 👋</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.7;">
      It's been <strong>${daysSinceLastStudy} days</strong> since you last studied on StudyFlow.
      Your subjects are waiting and there are new resources available!
    </p>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.7;">
      Even 15 minutes a day makes a big difference. Come back and keep your momentum going.
    </p>
    <div style="text-align:center;">
      <a href="${CLIENT_URL}/dashboard"
         style="background:#1a2a5e;color:#fff;text-decoration:none;padding:12px 32px;
                border-radius:10px;font-size:14px;font-weight:700;display:inline-block;">
        Resume Studying →
      </a>
    </div>
    <p style="margin:20px 0 0;text-align:center;">
      <a href="${CLIENT_URL}/dashboard/settings" style="color:#9ca3af;font-size:12px;">
        Unsubscribe from these emails
      </a>
    </p>
  `;
 
  await resend.emails.send({
    from:    FROM,
    to,
    subject: `We miss you, ${name}! Come back to StudyFlow 📚`,
    html:    layout(content),
  });
}
 