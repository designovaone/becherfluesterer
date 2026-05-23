import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, users } from "@/db";
import { generateTempPassword, hashPassword, isAdmin } from "@/lib/auth";

// Per-user cookie name (bf_temp_pw_<id>) avoids cross-tab reset races. Path is
// scoped to /admin/nutzer so the cookie is only ever sent on requests that
// can actually display it. Set and clear must use this EXACT same path or the
// browser treats them as separate cookies (RFC 6265 §5.1.4).
const TEMP_COOKIE_PATH = "/admin/nutzer";
const TEMP_COOKIE_MAX_AGE = 60;

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  if (!(await isAdmin())) {
    return NextResponse.redirect(`${origin}/admin/anmelden`, 303);
  }

  const fd = await req.formData();
  const op = String(fd.get("op") ?? "");
  const back = `${origin}/admin/nutzer`;
  const fail = (msg: string) =>
    NextResponse.redirect(`${back}?fehler=${encodeURIComponent(msg)}`, 303);

  if (op === "delete") {
    const id = Number(fd.get("id"));
    if (!id) return fail("Ungültige ID.");
    await db.delete(users).where(eq(users.id, id));
    return NextResponse.redirect(back, 303);
  }

  if (op === "reset") {
    const id = Number(fd.get("id"));
    if (!Number.isInteger(id) || id <= 0) return fail("Ungültige ID.");
    const temp = generateTempPassword();
    // Single UPDATE: bumps password and session_epoch atomically, so the new
    // password and the cross-device session invalidation move together even
    // under concurrent updates.
    const updated = await db
      .update(users)
      .set({
        passwordHash: hashPassword(temp),
        sessionEpoch: sql`${users.sessionEpoch} + 1`,
      })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!updated[0]) return fail("Mitglied nicht gefunden.");
    const c = await cookies();
    c.set(`bf_temp_pw_${id}`, temp, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: TEMP_COOKIE_PATH,
      maxAge: TEMP_COOKIE_MAX_AGE,
    });
    return NextResponse.redirect(`${back}?show=${id}`, 303);
  }

  return fail("Unbekannte Aktion.");
}
