import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_USER = "bf_user";
const COOKIE_ADMIN = "bf_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 Tage

function secret(): string {
  const s = process.env.COOKIE_SECRET;
  if (!s || s.length < 32) {
    throw new Error("COOKIE_SECRET fehlt oder ist zu kurz (min. 32 Zeichen).");
  }
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function pack(value: string): string {
  return `${value}.${sign(value)}`;
}

function unpack(packed: string | undefined): string | null {
  if (!packed) return null;
  const idx = packed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = packed.slice(0, idx);
  const sig = packed.slice(idx + 1);
  const expected = sign(value);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? value : null;
}

// ---------- Passwort-Hashing (scrypt) ----------

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(plain.normalize("NFKC"), salt, 64);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const key = Buffer.from(parts[2], "base64url");
  const test = scryptSync(plain.normalize("NFKC"), salt, key.length);
  return key.length === test.length && timingSafeEqual(key, test);
}

// ---------- Viewer-Session ----------

export type ViewerSession = { userId: number; name: string };

export async function setViewerSession(s: ViewerSession) {
  const payload = `${s.userId}|${encodeURIComponent(s.name)}`;
  (await cookies()).set(COOKIE_USER, pack(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getViewerSession(): Promise<ViewerSession | null> {
  const raw = (await cookies()).get(COOKIE_USER)?.value;
  const value = unpack(raw);
  if (!value) return null;
  const [idStr, nameEnc] = value.split("|");
  const userId = Number(idStr);
  if (!Number.isFinite(userId)) return null;
  return { userId, name: decodeURIComponent(nameEnc ?? "") };
}

export async function requireViewer(): Promise<ViewerSession> {
  const s = await getViewerSession();
  if (!s) redirect("/anmelden");
  return s;
}

// ---------- Admin-Session ----------

export async function setAdminSession() {
  (await cookies()).set(COOKIE_ADMIN, pack("1"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function isAdmin(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE_ADMIN)?.value;
  return unpack(raw) === "1";
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/anmelden");
}

// ---------- Logout ----------

export async function clearAllSessions() {
  const c = await cookies();
  c.delete(COOKIE_USER);
  c.delete(COOKIE_ADMIN);
}
