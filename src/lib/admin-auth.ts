import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ballot_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function credentialsAreValid(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUsername || !expectedPassword) return false;
  return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
}

export function createAdminSession() {
  if (!sessionSecret()) throw new Error("ADMIN_SESSION_SECRET is required");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSession(value?: string) {
  if (!value || !sessionSecret()) return false;
  const [payload, suppliedSignature] = value.split(".");
  if (!payload || !suppliedSignature || Number(payload) <= Date.now()) return false;
  const expectedSignature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return safeEqual(suppliedSignature, expectedSignature);
}

export async function adminIsAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
}
