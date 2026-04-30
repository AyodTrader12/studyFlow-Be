// server/src/services/emailService.ts
// Nodemailer replacement for Resend.
// Every template is identical — only the sending mechanism changed.
//
// HOW NODEMAILER WORKS:
// Nodemailer creates a "transporter" — an object that knows how to connect
// to your email provider's SMTP server and send emails through it.
// SMTP (Simple Mail Transfer Protocol) is the standard protocol every
// email provider uses to receive outgoing mail.
//
// You give Nodemailer:
//   - SMTP host (e.g. smtp.gmail.com)
//   - SMTP port (465 for SSL, 587 for TLS)
//   - Your email address and app password
//
// Nodemailer opens a connection to that server, authenticates,
// hands it the email, and the provider delivers it to the recipient.

import nodemailer from "nodemailer";
import type Mail   from "nodemailer/lib/mailer";

const CLIENT_URL = process.env.CLIENT_URL ;
const YEAR       = new Date().getFullYear();

// ── Create the transporter once at module load ────────────────────────────────
// The transporter is reused for every email — no need to recreate it.
//
// NODE_ENV check: in development we use Ethereal (a fake SMTP inbox) so you
// don't accidentally spam real people. In production we use your real provider.

let transporter: nodemailer.Transporter;

if (process.env.NODE_ENV === "production") {
  // ── PRODUCTION — your real email provider ────────────────────────────────
  // Works with any SMTP provider: Gmail, Outlook, Yahoo, Zoho, SendGrid, etc.
  // See Section 3 of the explanation below for provider-specific settings.
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,    // e.g. "smtp.gmail.com"
    port:   parseInt(process.env.SMTP_PORT || "465"), 
    secure: true,
     // true for port 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER,    // your email address
      pass: process.env.SMTP_PASS,    // your app password (NOT your login password)
    },
      family: 4// Force IPv4 (some providers have issues with IPv6)
  }as any );
} else {
  // ── DEVELOPMENT — Ethereal fake SMTP ─────────────────────────────────────
  // Ethereal catches emails without delivering them.
  // You can preview them at https://ethereal.email
  // Credentials are auto-generated each time the server starts.
  //
  // To use Ethereal:
  // 1. Start your dev server
  // 2. Sign up → the terminal prints "Preview URL: https://ethereal.email/message/..."
  // 3. Open that URL to see the exact email the student would receive
  nodemailer.createTestAccount().then((account) => {
    transporter = nodemailer.createTransport({
      host:   "smtp.ethereal.email",
      port:   587,
      secure: false,
      auth: {
        user: account.user,
        pass: account.pass,
      },
      family: 4 // Force IPv4 (Ethereal has issues with IPv6)
    } as any);
    console.log(
      "📧 Ethereal email account ready:",
      account.user,
      "\n   Preview emails at: https://ethereal.email"
    );
  });
}

// ── Helper: send an email and log the preview URL in development ──────────────
async function sendEmail(options: Mail.Options): Promise<void> {
  // Wait for transporter to be ready (handles async Ethereal setup)
  if (!transporter) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? `"StudyFlow" <noreply@studyflow.com>`,
    ...options,
  });

  // In development, print the Ethereal preview URL so you can see the email
  if (process.env.NODE_ENV !== "production") {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Email preview: ${previewUrl}`);
    }
  }
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────
// Every email is wrapped in this HTML shell — same header, footer, width.
function layout(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f3fa;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
  <tr>
    <td style="background:#1a2a5e;padding:28px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">StudyFlow</h1>
      <p style="margin:6px 0 0;color:#93aad4;font-size:12px;">Learn Smarter. Study Better.</p>
    </td>
  </tr>
  <tr><td style="padding:36px 40px 28px;">${content}</td></tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">© ${YEAR} StudyFlow. All rights reserved.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── OTP code block HTML ───────────────────────────────────────────────────────
function otpBlock(code: string): string {
  const digits = code.split("");
  const boxes  = digits.map(
    (d) =>
      `<td style="padding:0 4px;">
         <div style="width:44px;height:56px;border:2px solid #1a2a5e;border-radius:12px;
                     display:inline-flex;align-items:center;justify-content:center;
                     font-size:28px;font-weight:800;color:#1a2a5e;background:#f0f3fa;">
           ${d}
         </div>
       </td>`
  ).join("");

  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>${boxes}</tr>
    </table>`;
}

// ── 1. Email verification OTP ─────────────────────────────────────────────────
export async function sendVerificationOtp(params: {
  to:   string;
  name: string;
  otp:  string;
}): Promise<void> {
  const { to, name, otp } = params;

  const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:20px;font-weight:700;">
      Welcome to StudyFlow, ${name}!
    </h2>
    <p style="margin:0 0 4px;color:#4b5563;font-size:14px;line-height:1.7;">
      Your account has been created. Enter the 6-digit code below to verify your email address.
    </p>
    ${otpBlock(otp)}
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 20px;margin:16px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        This code expires in <strong>10 minutes</strong>.
        Do not share it with anyone.
      </p>
    </div>
    <p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.7;">
      If you did not create a StudyFlow account, you can safely ignore this email.
    </p>`;

  await sendEmail({
    to,
    subject: `${otp} is your StudyFlow verification code`,
    html:    layout(content),
  });
}

// ── 2. Verified confirmation email ───────────────────────────────────────────
export async function sendVerifiedConfirmation(params: {
  to:   string;
  name: string;
}): Promise<void> {
  const { to, name } = params;

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:64px;height:64px;border-radius:50%;background:#dcfce7;
                  margin:0 auto 16px;display:flex;align-items:center;justify-content:center;
                  font-size:32px;">✅</div>
      <h2 style="margin:0;color:#1a2a5e;font-size:22px;">Email Verified!</h2>
    </div>
    <p style="color:#4b5563;font-size:15px;line-height:1.7;text-align:center;">
      Hi ${name}, your email has been verified and your StudyFlow account is fully active.
    </p>
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${CLIENT_URL}/auth/login"
         style="display:inline-block;background:#1a2a5e;color:#fff;text-decoration:none;
                padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Log In to StudyFlow
      </a>
    </div>`;

  await sendEmail({
    to,
    subject: "Your StudyFlow email has been verified",
    html:    layout(content),
  });
}

// ── 3. Password reset OTP ─────────────────────────────────────────────────────
export async function sendPasswordResetOtp(params: {
  to:   string;
  name: string;
  otp:  string;
}): Promise<void> {
  const { to, name, otp } = params;

  const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:20px;font-weight:700;">
      Reset your password
    </h2>
    <p style="margin:0 0 4px;color:#4b5563;font-size:14px;line-height:1.7;">
      Hi ${name}, we received a request to reset your StudyFlow password.
      Enter the code below on the reset page.
    </p>
    ${otpBlock(otp)}
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 20px;margin:16px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        This code expires in <strong>10 minutes</strong>.
        If you did not request a password reset, ignore this email — your password will not change.
      </p>
    </div>`;

  await sendEmail({
    to,
    subject: `${otp} — your StudyFlow password reset code`,
    html:    layout(content),
  });
}

// ── 4. Password changed notification ─────────────────────────────────────────
export async function sendPasswordChangedEmail(params: {
  to:   string;
  name: string;
}): Promise<void> {
  const { to, name } = params;

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:64px;height:64px;border-radius:50%;background:#dbeafe;
                  margin:0 auto 16px;display:flex;align-items:center;justify-content:center;
                  font-size:32px;">🔐</div>
      <h2 style="margin:0;color:#1a2a5e;font-size:20px;">Password Changed</h2>
    </div>
    <p style="color:#4b5563;font-size:14px;line-height:1.7;text-align:center;">
      Hi ${name}, your StudyFlow password was successfully changed on
      <strong>${new Date().toLocaleDateString("en-NG", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })}</strong>.
    </p>
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.6;">
        Didn't change your password?
        <a href="${CLIENT_URL}/auth/reset-password" style="color:#1a2a5e;font-weight:700;">
          Reset it immediately
        </a>
        and contact support.
      </p>
    </div>
    <div style="text-align:center;">
      <a href="${CLIENT_URL}/auth/login"
         style="display:inline-block;background:#1a2a5e;color:#fff;text-decoration:none;
                padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Go to Login
      </a>
    </div>`;

  await sendEmail({
    to,
    subject: "Your StudyFlow password has been changed",
    html:    layout(content),
  });
}

// ── 5. Welcome email ──────────────────────────────────────────────────────────
export async function sendWelcomeEmail(params: {
  to:   string;
  name: string;
}): Promise<void> {
  const { to, name } = params;

  const features: [string, string][] = [
    ["Browse", "resources by subject and class level"],
    ["Watch",  "video lessons inside the app"],
    ["Read",   "detailed study notes and examples"],
    ["Save",   "bookmarks to revisit later"],
    ["Set",    "study reminders with email alerts"],
    ["Get",    "AI summaries after viewing any resource"],
  ];

  const content = `
    <h2 style="margin:0 0 16px;color:#1a2a5e;font-size:22px;font-weight:700;">
      Welcome aboard, ${name}!
    </h2>
    <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">
      Your account is now active. Here is what you can do on StudyFlow:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${features.map(([verb, rest]) => `
        <tr><td style="padding:6px 0;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:60px;color:#1a2a5e;font-weight:700;font-size:13px;">${verb}</td>
            <td style="color:#374151;font-size:13px;padding-left:8px;">${rest}</td>
          </tr></table>
        </td></tr>`).join("")}
    </table>
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${CLIENT_URL}/auth/login"
         style="display:inline-block;background:#1a2a5e;color:#fff;text-decoration:none;
                padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Start Studying
      </a>
    </div>`;

  await sendEmail({
    to,
    subject: `Welcome to StudyFlow, ${name}!`,
    html:    layout(content),
  });
}

// ── 6. Study reminder ─────────────────────────────────────────────────────────
export async function sendReminderEmail(params: {
  to:       string;
  name:     string;
  text:     string;
  date:     string;
  time:     string;
}): Promise<void> {
  const { to, name, text, date, time } = params;

  const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:20px;font-weight:700;">
      ⏰ Study Reminder
    </h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.7;">
      Hi ${name}, this is your scheduled study reminder.
    </p>
    <div style="background:#f0f3fa;border-left:4px solid #1a2a5e;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;color:#1a2a5e;font-size:16px;font-weight:700;">${text}</p>
      <p style="margin:6px 0 0;color:#6b7280;font-size:13px;">${date} at ${time}</p>
    </div>
    <div style="text-align:center;margin:24px 0 8px;">
      <a href="${CLIENT_URL}/dashboard"
         style="display:inline-block;background:#1a2a5e;color:#fff;text-decoration:none;
                padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Start Studying
      </a>
    </div>`;

  await sendEmail({
    to,
    subject: `⏰ Reminder: ${text}`,
    html:    layout(content),
  });
}

// ── 6. Inactivity nudge ───────────────────────────────────────────────────────
export async function sendInactivityEmail(params:{
  to: string;
   name: string;
   daysSinceLastStudy: number;
}): Promise<void> {
  const {to,name,daysSinceLastStudy} = params;

  const content = `
    <h2 style="margin:0 0 16px;color:#1a2a5e;">Hi ${name}, we miss you! 👋</h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.7;">
      It has been <strong>${daysSinceLastStudy} days</strong> since you last studied on StudyFlow.
      Your subjects are waiting!
    </p>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.7;">
      Even 15 minutes a day makes a big difference. Come back and keep your momentum going.
    </p>
   <a href = "${(`${CLIENT_URL}/dashboard`)} "Resume Studying → >
    <p style="margin:20px 0 0;text-align:center;">
      <a href="${CLIENT_URL}/dashboard/settings" style="color:#9ca3af;font-size:12px;">
        Unsubscribe from these emails
      </a>
    </p>
  `;
 
  await sendEmail({
    to,
    subject: `We miss you, ${name}! Come back to StudyFlow 📚`,
    html:    layout(content),
  });
}

// ── 5. Streak milestone email ─────────────────────────────────────────────────
export async function sendStreakMilestoneEmail(params:{
  to:string,
  name: string,
  streak: number
}): Promise<void> {
  const {to,name,streak} = params;
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
      ${(`${CLIENT_URL}/dashboard`)} "Keep It Going →"
    </div>
  `;
 
  await sendEmail({
    to,
    subject: `${emoji} You've hit a ${streak}-day study streak on StudyFlow!`,
    html:    layout(content),
  });
}