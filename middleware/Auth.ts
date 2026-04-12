// server/src/middleware/auth.ts
// Reads the JWT from the httpOnly cookie "sf_token".
// Verifies it, finds the user in MongoDB, attaches to req.user.
// No Firebase — everything is in our own DB.

import { Response, NextFunction } from "express";
import { verifyToken }  from "../services/TokenService";
import User             from "../models/user";
import type { AuthRequest } from "../types/Auth";

export async function protect(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction
): Promise<void> {
  // Read token from cookie (primary) or Authorization header (fallback for API testing)
  const cookieToken = req.cookies?.sf_token as string | undefined;
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : undefined;

  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({ message: "Not authenticated. Please log in." });
    return;
  }

  try {
    const payload = verifyToken(token);

    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({ message: "Account not found. Please log in again." });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    const err = error as { name?: string };
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ message: "Session expired. Please log in again." });
    } else {
      res.status(401).json({ message: "Invalid session. Please log in again." });
    }
  }
}