"use strict";
// server/src/services/tokenService.ts
// Signs and verifies JWT access tokens.
// Token is stored in an httpOnly cookie (not localStorage) for security.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
if (!SECRET)
    throw new Error("JWT_SECRET is not set in environment variables");
/**
 * Sign a JWT for a logged-in user.
 */
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}
/**
 * Verify a JWT and return the decoded payload.
 * Throws if invalid or expired.
 */
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
