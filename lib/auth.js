// Auth: JWT session in an httpOnly cookie. Every account — buyer or admin —
// signs in passwordless via an emailed one-time code (see lib/otp.js);
// there's no password anywhere in this app.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomInt } from "node:crypto";

const COOKIE_NAME = "da_session";
const JWT_ALG = "HS256";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload; // { id, email, role, iat, exp }
  } catch {
    return null;
  }
}

export async function setSessionCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Returns { id, email, role } or null. Safe to call from any route handler.
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth() {
  return getSession(); // null means "not logged in" — caller returns 401
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

// 6-digit login code, e.g. "042817". randomInt avoids modulo bias.
export function generateOtpCode() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}
