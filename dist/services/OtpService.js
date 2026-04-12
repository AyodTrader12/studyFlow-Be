"use strict";
// server/src/services/otpService.ts
// Generates and verifies 6-digit OTP codes.
// The code is HASHED before storing in MongoDB so it can't be read from the DB.
// Plain code is only ever in memory (and in the email body).
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
exports.generateOtp = generateOtp;
exports.otpExpiresAt = otpExpiresAt;
exports.verifyOtp = verifyOtp;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const OTP_EXPIRY_MINUTES = 10;
/**
 * Generate a random 6-digit OTP.
 * Returns { plain, hash } — store the hash in MongoDB, email the plain code.
 */
function generateOtp() {
    return __awaiter(this, void 0, void 0, function* () {
        // Generate a cryptographically secure 6-digit number
        const plain = String(crypto_1.default.randomInt(100000, 999999));
        const hash = yield bcrypt_1.default.hash(plain, 10);
        return { plain, hash };
    });
}
/**
 * Returns the Date when the OTP expires (now + 10 minutes).
 */
function otpExpiresAt() {
    return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}
/**
 * Verify a plain OTP against the stored hash.
 * Also checks the expiry time.
 */
function verifyOtp(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { plain, hash, expiresAt } = params;
        if (!hash || !expiresAt) {
            return { valid: false, reason: "No OTP found. Please request a new code." };
        }
        if (new Date() > expiresAt) {
            return { valid: false, reason: "This code has expired. Please request a new one." };
        }
        const match = yield bcrypt_1.default.compare(plain, hash);
        if (!match) {
            return { valid: false, reason: "Incorrect code. Please check and try again." };
        }
        return { valid: true };
    });
}
