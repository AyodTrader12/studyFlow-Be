// src/config/db.ts
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
export async function connectDB(): Promise<void> {
  try {
    const uri = process.env.MONGO_LIVE_URL;
    if (!uri) throw new Error("MONGO_LIVE_URL is not defined in environment variables");

    const conn = await mongoose.connect(uri, {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ MongoDB connection failed: ${message}`);
    process.exit(1);
  }
}

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected");
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

mongoose.connection.on("close", () => {
  console.log("🔌 MongoDB connection closed");
});