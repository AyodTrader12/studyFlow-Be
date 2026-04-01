// src/middleware/auth.ts
import { Response, NextFunction } from "express";
import { auth } from "../utils/Firebase";
import User from "../models/user";
import type { AuthRequest } from "../types/index";

export async function protect(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided. Please log in." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await auth.verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (!user) {
      user = await User.create({
        firebaseUid:  decoded.uid,
        email:        decoded.email ?? "",
        displayName:  decoded.name ?? (decoded.email?.split("@")[0] ?? "Student"),
        photoURL:     decoded.picture ?? "",
        isVerified:   decoded.email_verified ?? false,
      });
    }

    req.firebaseUser = {
      uid:            decoded.uid,
      email:          decoded.email ?? "",
      name:           decoded.name,
      picture:        decoded.picture,
      email_verified: decoded.email_verified,
      iat:            decoded.iat,
      exp:            decoded.exp,
    };
    req.user = user;

    next();
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "auth/id-token-expired") {
      res.status(401).json({ message: "Session expired. Please log in again." });
      return;
    }
    res.status(401).json({ message: "Invalid token." });
  }
}