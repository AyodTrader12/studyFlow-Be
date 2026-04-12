// server/src/services/tokenService.ts
// Signs and verifies JWT access tokens.
// Token is stored in an httpOnly cookie (not localStorage) for security.

import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types/Auth";

const SECRET      = process.env.JWT_SECRET!;
const EXPIRES_IN  = process.env.JWT_EXPIRES_IN || "7d";

if (!SECRET) throw new Error("JWT_SECRET is not set in environment variables");

/**
 * Sign a JWT for a logged-in user.
 */
export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

/**
 * Verify a JWT and return the decoded payload.
 * Throws if invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}