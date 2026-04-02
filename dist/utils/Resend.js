"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FROM = exports.resend = void 0;
const resend_1 = require("resend");
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey)
    throw new Error("RESEND_API_KEY is not defined in environment variables");
exports.resend = new resend_1.Resend(apiKey);
exports.FROM = (_a = process.env.EMAIL_FROM) !== null && _a !== void 0 ? _a : "StudyFlow <noreply@studyflow.com>";
