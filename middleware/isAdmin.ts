// src/middleware/isAdmin.ts
import { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/index"

export function isAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ message: "Access denied. Admins only." });
    return;
  }
  next();
}