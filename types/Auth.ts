// server/src/types/auth.ts
import { Request } from "express";
import { Types }   from "mongoose";
import type { IUserDocument } from "../models/user";

// What we store inside the JWT payload
export interface JwtPayload {
  userId:  string;       // MongoDB _id as string
  email:   string;
  isAdmin: boolean;
  iat?:    number;
  exp?:    number;
}

// Every protected route gets req.user injected by the auth middleware
export interface AuthRequest extends Request {
  user?: IUserDocument;
}