import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createHmac,
  scryptSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { eq } from "drizzle-orm";
import { db, users, type User } from "@/db";
import { words } from "@/lib/wordlist";

const COOKIE_USER = "bf_user";
const COOKIE_ADMIN = "bf_admin";
const COOKIE_GATE = "bf_gate";

export const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 Jahr (sliding-refresh via middleware)
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; //  30 Tage
export const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; //  60 Tage

// Precomputed scrypt hash of the literal string "dummy". Used by login when no
// user row matches, so the failure path still spends ~one scrypt verification
// of CPU and isn't a trivial timing oracle for username enumeration. Computed
// once via node -e (see impl-plan-gated-signup.md glossary), pasted in as a
// constant so there is zero runtime cost on module load.
export const DUMMY_SCRYPT_HASH =
  "scrypt$O5-OCdr9ll_vNbZ2CgkVfQ$5yPQNo78VHMnOZOENfUiCWZJH4bcTPFqY8b0nAv5tnLteCp-wJcHvfHcIPN4vyBsOOF8QJBAiwE0l1f1u6Hzaw";

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

// ---------- Name-Normalisierung ----------

// NFKC → trim → collapse internal whitespace → lowercase. Used to derive the
// lookup keys (first_name_key, last_name_key) from raw form input. We do NOT
// fold ß to ss and we do NOT fold umlauts; "Weiß" and "Weiss" coexist as
// distinct accounts by design. Passwords are NOT normalized — they pass
// through scryptSync as-is, modulo the NFKC done in hashPassword/verifyPassword.
export function normalizeName(s: string): string {
  return s
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// ---------- Temp-Passwort-Generator ----------

// 4 random words from the curated ASCII wordlist + a 2-digit suffix.
// ~50 bits of entropy against scrypt: trillions of years to brute-force even
// without rate limiting. Format: `mond-kreuz-elf-baum-72`. Output is always
// ASCII and lowercase, safe to send via WhatsApp / SMS / email.
export function generateTempPassword(): string {
  const picks: string[] = [];
  for (let i = 0; i < 4; i++) {
    picks.push(words[randomInt(0, words.length)]);
  }
  const suffix = String(randomInt(0, 100)).padStart(2, "0");
  return `${picks.join("-")}-${suffix}`;
}

// ---------- Viewer-Session ----------

// Cookie value format:
//   bf_user = "v2|<userId>|<sessionEpoch>"  (then ".<hmac>" via pack())
// The "v2|" prefix is structural. Any payload whose first |-separated part is
// not "v2" is rejected by parsing — that cleanly invalidates the legacy
// 2-segment "<userId>|<encodeURIComponent(name)>" cookies from main.
export type ViewerCookie = { userId: number; epoch: number };

export async function setViewerSession(s: {
  id: number;
  sessionEpoch: number;
}): Promise<void> {
  const payload = `v2|${s.id}|${s.sessionEpoch}`;
  (await cookies()).set(COOKIE_USER, pack(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getViewerSession(): Promise<ViewerCookie | null> {
  const raw = (await cookies()).get(COOKIE_USER)?.value;
  const value = unpack(raw);
  if (!value) return null;
  const parts = value.split("|");
  if (parts.length !== 3 || parts[0] !== "v2") return null;
  const userId = Number(parts[1]);
  const epoch = Number(parts[2]);
  if (!Number.isFinite(userId) || !Number.isFinite(epoch)) return null;
  if (!Number.isInteger(userId) || !Number.isInteger(epoch)) return null;
  return { userId, epoch };
}

// Validates the cookie against the DB on every call: row must still exist AND
// session_epoch on the row must match the cookie's epoch. Admin-reset bumps
// the row's epoch, which makes this return null on the user's other devices
// on their very next request (sliding refresh notwithstanding — the cookie's
// signed payload still encodes the old epoch). Adds one DB query per page;
// acceptable at 30-user scale. DB errors are re-thrown — we'd rather fail
// loudly than silently log everyone out on a Neon hiccup.
export async function getViewerUser(): Promise<User | null> {
  const cookie = await getViewerSession();
  if (!cookie) return null;
  const row = (
    await db.select().from(users).where(eq(users.id, cookie.userId)).limit(1)
  )[0];
  if (!row) return null;
  if (row.sessionEpoch !== cookie.epoch) return null;
  return row;
}

export async function requireViewer(): Promise<User> {
  const u = await getViewerUser();
  if (!u) redirect("/anmelden");
  return u;
}

// ---------- Gate-Cookie ----------

export async function setGateCookie(): Promise<void> {
  (await cookies()).set(COOKIE_GATE, pack("v2|1"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GATE_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function hasGateCookie(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE_GATE)?.value;
  return unpack(raw) === "v2|1";
}

export async function clearGateCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_GATE);
}

// ---------- Admin-Session ----------

// IMPORTANT: the admin cookie value stays "1" (NOT "v2|1"). The HMAC is over
// the literal string "1", so prefixing v2| "for consistency" would invalidate
// every active admin session on the very next request. The asymmetry between
// bf_user (v2|<id>|<epoch>) and bf_admin (1) is intentional and load-bearing.
export async function setAdminSession() {
  (await cookies()).set(COOKIE_ADMIN, pack("1"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE,
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

// Clears bf_user and bf_admin. Deliberately does NOT clear bf_gate — on a
// personal device the gate friction adds nothing (member won't re-type the
// passphrase anyway), and on a shared device the marginal protection isn't
// worth it (anyone with a known account password can log right back in).
export async function clearAllSessions() {
  const c = await cookies();
  c.delete(COOKIE_USER);
  c.delete(COOKIE_ADMIN);
}
