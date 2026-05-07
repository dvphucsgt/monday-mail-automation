import jwt from "jsonwebtoken";
import type { Env } from "./types";

export function verifyMondayJwt(token: string, secret: string) {
  try {
    const sessionToken = token.replace("Bearer ", "");
    return jwt.verify(sessionToken, secret) as any;
  } catch (e: any) {
    console.error("JWT Verification Error:", e.message);
    return null;
  }
}

export function verifyAuth(request: Request, env: Env, url: URL) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return {
      isValid: false,
      error: "Unauthorized: Missing token",
      status: 401,
    };
  }

  const payload = verifyMondayJwt(authHeader, env.MONDAY_CLIENT_SECRET);
  if (!payload) {
    return {
      isValid: false,
      error: "Unauthorized: Invalid token",
      status: 401,
    };
  }

  return { isValid: true, payload };
}
