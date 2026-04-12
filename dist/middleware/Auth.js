"use strict";
// server/src/middleware/auth.ts
// Reads the JWT from the httpOnly cookie "sf_token".
// Verifies it, finds the user in MongoDB, attaches to req.user.
// No Firebase — everything is in our own DB.
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
exports.protect = protect;
const TokenService_1 = require("../services/TokenService");
const user_1 = __importDefault(require("../models/user"));
function protect(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        // Read token from cookie (primary) or Authorization header (fallback for API testing)
        const cookieToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sf_token;
        const headerToken = ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.startsWith("Bearer "))
            ? req.headers.authorization.split(" ")[1]
            : undefined;
        const token = cookieToken || headerToken;
        if (!token) {
            res.status(401).json({ message: "Not authenticated. Please log in." });
            return;
        }
        try {
            const payload = (0, TokenService_1.verifyToken)(token);
            const user = yield user_1.default.findById(payload.userId);
            if (!user) {
                res.status(401).json({ message: "Account not found. Please log in again." });
                return;
            }
            req.user = user;
            next();
        }
        catch (error) {
            const err = error;
            if (err.name === "TokenExpiredError") {
                res.status(401).json({ message: "Session expired. Please log in again." });
            }
            else {
                res.status(401).json({ message: "Invalid session. Please log in again." });
            }
        }
    });
}
