"use strict";
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
const Firebase_1 = require("../utils/Firebase");
const user_1 = __importDefault(require("../models/user"));
function protect(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            res.status(401).json({ message: "No token provided. Please log in." });
            return;
        }
        const token = authHeader.split(" ")[1];
        try {
            const decoded = yield Firebase_1.auth.verifyIdToken(token);
            let user = yield user_1.default.findOne({ firebaseUid: decoded.uid });
            if (!user) {
                user = yield user_1.default.create({
                    firebaseUid: decoded.uid,
                    email: (_a = decoded.email) !== null && _a !== void 0 ? _a : "",
                    displayName: (_b = decoded.name) !== null && _b !== void 0 ? _b : ((_d = (_c = decoded.email) === null || _c === void 0 ? void 0 : _c.split("@")[0]) !== null && _d !== void 0 ? _d : "Student"),
                    photoURL: (_e = decoded.picture) !== null && _e !== void 0 ? _e : "",
                    isVerified: (_f = decoded.email_verified) !== null && _f !== void 0 ? _f : false,
                });
            }
            req.firebaseUser = {
                uid: decoded.uid,
                email: (_g = decoded.email) !== null && _g !== void 0 ? _g : "",
                name: decoded.name,
                picture: decoded.picture,
                email_verified: decoded.email_verified,
                iat: decoded.iat,
                exp: decoded.exp,
            };
            req.user = user;
            next();
        }
        catch (error) {
            const err = error;
            if (err.code === "auth/id-token-expired") {
                res.status(401).json({ message: "Session expired. Please log in again." });
                return;
            }
            res.status(401).json({ message: error.message });
        }
    });
}
