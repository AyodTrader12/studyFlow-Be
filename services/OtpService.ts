// server/src/services/otpService.ts
// Generates and verifies 6-digit OTP codes.
// The code is HASHED before storing in MongoDB so it can't be read from the DB.
// Plain code is only ever in memory (and in the email body).

import bcrypt from "bcrypt";
import crypto from "crypto";

const OTP_EXPIRY_MINUTES = 10;

/**
 * Generate a random 6-digit OTP.
 * Returns { plain, hash } — store the hash in MongoDB, email the plain code.
 */
export async function generateOtp(): Promise<{ plain: string; hash: string }> {
  // Generate a cryptographically secure 6-digit number
  const plain = String(crypto.randomInt(100000, 999999));
  const hash  = await bcrypt.hash(plain, 10);
  return { plain, hash };
}

/**
 * Returns the Date when the OTP expires (now + 10 minutes).
 */
export function otpExpiresAt(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Verify a plain OTP against the stored hash.
 * Also checks the expiry time.
 */
export async function verifyOtp(params: {
  plain:     string;
  hash:      string | null;
  expiresAt: Date   | null;
}): Promise<{ valid: boolean; reason?: string }> {
  const { plain, hash, expiresAt } = params;

  if (!hash || !expiresAt) {
    return { valid: false, reason: "No OTP found. Please request a new code." };
  }

  if (new Date() > expiresAt) {
    return { valid: false, reason: "This code has expired. Please request a new one." };
  }

  const match = await bcrypt.compare(plain, hash);
  if (!match) {
    return { valid: false, reason: "Incorrect code. Please check and try again." };
  }

  return { valid: true };
}