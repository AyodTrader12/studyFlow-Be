"use strict";
// server/src/services/emailService.ts
// SendGrid implementation — same 6 email templates, only the sending mechanism changed.
//
// ⚠️  IMPORTANT: SendGrid has NO permanent free tier as of 2025.
//     You get a 60-day trial (100 emails/day), then must pay $19.95/month.
//     If your trial expires, ALL emails stop — users cannot verify or reset passwords.
//     Free alternatives: Resend (3,000/month free), Brevo (300/day free).
//
// HOW SENDGRID WORKS:
// Unlike Nodemailer which connects directly to an SMTP server,
// SendGrid uses an HTTP REST API. You call their endpoint with your API key
// and they deliver the email through their infrastructure.
// No SMTP ports, no TLS config — just a POST request with JSON.
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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationOtp = sendVerificationOtp;
exports.sendVerifiedConfirmation = sendVerifiedConfirmation;
exports.sendPasswordResetOtp = sendPasswordResetOtp;
exports.sendPasswordChangedEmail = sendPasswordChangedEmail;
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendReminderEmail = sendReminderEmail;
exports.sendStreakMilestoneEmail = sendStreakMilestoneEmail;
exports.sendInactivityEmail = sendInactivityEmail;
const mail_1 = __importDefault(require("@sendgrid/mail"));
// Initialise SendGrid with your API key once at module load.
// Every email call after this uses the same key automatically.
if (!process.env.SENDGRID_API_KEY) {
    console.warn("⚠️  SENDGRID_API_KEY is not set. Emails will fail.");
}
else {
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
}
const FROM_EMAIL = (_a = process.env.EMAIL_FROM_ADDRESS) !== null && _a !== void 0 ? _a : "ibrahimpopoola292@gmail.com";
const FROM_NAME = (_b = process.env.EMAIL_FROM_NAME) !== null && _b !== void 0 ? _b : "ibrahim";
const CLIENT_URL = (_c = process.env.CLIENT_URL) !== null && _c !== void 0 ? _c : "https://study-flow-fe.vercel.app";
const YEAR = new Date().getFullYear();
// ── Helper: send via SendGrid ─────────────────────────────────────────────────
function sendEmail(params) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const msg = {
            to: params.to,
            from: {
                email: FROM_EMAIL,
                name: FROM_NAME,
            },
            subject: params.subject,
            html: params.html,
            // Plain text fallback for email clients that don't render HTML
            text: params.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        };
        try {
            yield mail_1.default.send(msg);
        }
        catch (error) {
            // SendGrid returns detailed error info — extract and log it
            const sgError = (_e = (_d = (_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.errors) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) !== null && _e !== void 0 ? _e : error.message;
            console.error(`SendGrid error sending to ${params.to}:`, sgError);
            throw new Error(`Email failed: ${sgError}`);
        }
    });
}
// ── Shared HTML layout ────────────────────────────────────────────────────────
function layout(content) {
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
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        © ${YEAR} StudyFlow. All rights reserved.
      </p>
      <p style="margin:6px 0 0;color:#9ca3af;font-size:11px;">
        You are receiving this email because you have an account on StudyFlow.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}
// ── OTP digit boxes HTML ──────────────────────────────────────────────────────
function otpBlock(code) {
    const digits = code.split("");
    const boxes = digits.map((d) => `<td style="padding:0 4px;">
         <div style="width:44px;height:56px;border:2px solid #1a2a5e;border-radius:12px;
                     display:inline-flex;align-items:center;justify-content:center;
                     font-size:28px;font-weight:800;color:#1a2a5e;background:#f0f3fa;">
           ${d}
         </div>
       </td>`).join("");
    return `
    <table cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>${boxes}</tr>
    </table>`;
}
// ── 1. Email verification OTP ─────────────────────────────────────────────────
function sendVerificationOtp(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { to, name, otp } = params;
        const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:20px;font-weight:700;">
      Welcome to StudyFlow, ${name}!
    </h2>
    <p style="margin:0 0 4px;color:#4b5563;font-size:14px;line-height:1.7;">
      Your account has been created. Enter the 6-digit code below to verify your email address.
    </p>
    ${otpBlock(otp)}
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;
                padding:14px 20px;margin:16px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        This code expires in <strong>10 minutes</strong>.
        Do not share it with anyone.
      </p>
    </div>
    <p style="margin:16px 0 0;color:#6b7280;font-size:13px;line-height:1.7;">
      If you did not create a StudyFlow account, you can safely ignore this email.
    </p>`;
        yield sendEmail({
            to,
            subject: `${otp} is your StudyFlow verification code`,
            html: layout(content),
        });
    });
}
// ── 2. Verified confirmation ──────────────────────────────────────────────────
function sendVerifiedConfirmation(params) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield sendEmail({
            to,
            subject: "Your StudyFlow email has been verified",
            html: layout(content),
        });
    });
}
// ── 3. Password reset OTP ─────────────────────────────────────────────────────
function sendPasswordResetOtp(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { to, name, otp } = params;
        const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:20px;font-weight:700;">
      Reset your password
    </h2>
    <p style="margin:0 0 4px;color:#4b5563;font-size:14px;line-height:1.7;">
      Hi ${name}, we received a request to reset your StudyFlow password.
      Enter the code below on the verification page.
    </p>
    ${otpBlock(otp)}
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;
                padding:14px 20px;margin:16px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        This code expires in <strong>10 minutes</strong>.
        If you did not request a password reset, ignore this email —
        your password will not change.
      </p>
    </div>`;
        yield sendEmail({
            to,
            subject: `${otp} — your StudyFlow password reset code`,
            html: layout(content),
        });
    });
}
// ── 4. Password changed notification ─────────────────────────────────────────
function sendPasswordChangedEmail(params) {
    return __awaiter(this, void 0, void 0, function* () {
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
    <div style="background:#fef9c3;border:1px solid #fde047;border-radius:12px;
                padding:16px;margin:20px 0;">
      <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.6;">
        Didn't change your password?
        <a href="${CLIENT_URL}/auth/forgot-password" style="color:#1a2a5e;font-weight:700;">
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
        yield sendEmail({
            to,
            subject: "Your StudyFlow password has been changed",
            html: layout(content),
        });
    });
}
// ── 5. Welcome email ──────────────────────────────────────────────────────────
function sendWelcomeEmail(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { to, name } = params;
        const features = [
            ["Browse", "resources by subject and class level"],
            ["Watch", "video lessons inside the app"],
            ["Read", "detailed study notes and examples"],
            ["Save", "bookmarks to revisit later"],
            ["Set", "study reminders with email alerts"],
            ["Get", "AI summaries after viewing any resource"],
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
      <a href="${CLIENT_URL}/dashboard"
         style="display:inline-block;background:#1a2a5e;color:#fff;text-decoration:none;
                padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Start Studying
      </a>
    </div>`;
        yield sendEmail({
            to,
            subject: `Welcome to StudyFlow, ${name}!`,
            html: layout(content),
        });
    });
}
// ── 6. Study reminder ─────────────────────────────────────────────────────────
function sendReminderEmail(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { to, name, text, date, time } = params;
        const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:20px;font-weight:700;">
      ⏰ Study Reminder
    </h2>
    <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.7;">
      Hi ${name}, this is your scheduled study reminder.
    </p>
    <div style="background:#f0f3fa;border-left:4px solid #1a2a5e;border-radius:8px;
                padding:16px 20px;margin:16px 0;">
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
        yield sendEmail({
            to,
            subject: `⏰ Reminder: ${text}`,
            html: layout(content),
        });
    });
}
// ── 7. Streak milestone ───────────────────────────────────────────────────────
function sendStreakMilestoneEmail(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { to, name, streak } = params;
        const emoji = streak >= 100 ? "🏆" :
            streak >= 60 ? "🔥" :
                streak >= 30 ? "⭐" :
                    streak >= 14 ? "💪" : "🎉";
        const content = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:56px;margin-bottom:12px;">${emoji}</div>
      <h2 style="margin:0;color:#1a2a5e;font-size:24px;font-weight:800;">
        ${streak}-Day Streak!
      </h2>
    </div>
    <p style="color:#4b5563;font-size:15px;line-height:1.7;text-align:center;">
      Amazing work, ${name}! You have studied on StudyFlow for
      <strong>${streak} consecutive days</strong>.
      Keep going — consistency is the key to excellence.
    </p>
    <div style="background:#f0f3fa;border-radius:12px;padding:16px 20px;
                margin:20px 0;text-align:center;">
      <p style="margin:0;color:#1a2a5e;font-size:13px;font-weight:600;">
        ${streak >= 30
            ? "You are in the top 5% of StudyFlow students."
            : "You are building an excellent study habit."}
      </p>
    </div>
    <div style="text-align:center;margin:20px 0 8px;">
      <a href="${CLIENT_URL}/dashboard"
         style="display:inline-block;background:#1a2a5e;color:#fff;text-decoration:none;
                padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Keep the streak going →
      </a>
    </div>`;
        yield sendEmail({
            to,
            subject: `${emoji} You hit a ${streak}-day study streak on StudyFlow!`,
            html: layout(content),
        });
    });
}
// ── 8. Inactivity nudge ───────────────────────────────────────────────────────
function sendInactivityEmail(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { to, name, daysSinceLastStudy } = params;
        const content = `
    <h2 style="margin:0 0 8px;color:#1a2a5e;font-size:20px;font-weight:700;">
      We miss you, ${name}!
    </h2>
    <p style="color:#4b5563;font-size:14px;line-height:1.7;">
      It has been <strong>${daysSinceLastStudy} days</strong> since you last studied on StudyFlow.
      Your study materials are waiting — even 15 minutes today will keep your momentum going.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;
                padding:14px 20px;margin:16px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
        💡 <strong>Tip:</strong> Start with something short — a 5-minute video or a quick
        past question review. Small sessions add up.
      </p>
    </div>
    <div style="text-align:center;margin:24px 0 8px;">
      <a href="${CLIENT_URL}/dashboard"
         style="display:inline-block;background:#1a2a5e;color:#fff;text-decoration:none;
                padding:13px 34px;border-radius:10px;font-size:15px;font-weight:700;">
        Resume Studying
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0;">
      You can turn off these reminders in your
      <a href="${CLIENT_URL}/dashboard/settings" style="color:#1a2a5e;">account settings</a>.
    </p>`;
        yield sendEmail({
            to,
            subject: `${name}, your study streak is waiting for you 📚`,
            html: layout(content),
        });
    });
}
