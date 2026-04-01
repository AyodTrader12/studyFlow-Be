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
exports.connectDB = connectDB;
// src/config/db.ts
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function connectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const uri = process.env.MONGO_LIVE_URL;
            if (!uri)
                throw new Error("MONGO_LIVE_URL is not defined in environment variables");
            const conn = yield mongoose_1.default.connect(uri, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                maxPoolSize: 10,
                minPoolSize: 2,
                retryWrites: true,
                retryReads: true,
                heartbeatFrequencyMS: 10000,
            });
            console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error(`❌ MongoDB connection failed: ${message}`);
            process.exit(1);
        }
    });
}
mongoose_1.default.connection.on("connected", () => {
    console.log("✅ MongoDB connected");
});
mongoose_1.default.connection.on("disconnected", () => {
    console.log("⚠️  MongoDB disconnected");
});
mongoose_1.default.connection.on("reconnected", () => {
    console.log("🔄 MongoDB reconnected");
});
mongoose_1.default.connection.on("error", (err) => {
    console.error("❌ MongoDB error:", err.message);
});
mongoose_1.default.connection.on("close", () => {
    console.log("🔌 MongoDB connection closed");
});
