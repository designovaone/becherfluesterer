import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, settings, users } from "@/db";
import {
  DUMMY_SCRYPT_HASH,
  hashPassword,
  hasGateCookie,
  normalizeName,
  setGateCookie,
  setViewerSession,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;

  // CSRF defense in addition to SameSite=Lax. Origin may be absent (some
  // privacy extensions strip it on same-origin POSTs, certain Safari configs);
  // we only reject when it's present AND wrong, never when it's missing.
  const reqOrigin = req.headers.get("origin");
  if (reqOrigin && reqOrigin !== origin) {
    return new NextResponse("Cross-origin not allowed", { status: 403 });
  }

  const fd = await req.formData();
  const op = String(fd.get("op") ?? "");
  const back = (qs: string) =>
    NextResponse.redirect(`${origin}/anmelden${qs ? `?${qs}` : ""}`, 303);

  if (op === "gate") {
    const passphrase = String(fd.get("passphrase") ?? "");
    if (!passphrase) return back("fehler=passphrase");
    const [cfg] = await db.select().from(settings).limit(1);
    if (!cfg?.viewerPassphraseHash) return back("fehler=passphrase");
    if (!verifyPassword(passphrase, cfg.viewerPassphraseHash)) {
      return back("fehler=passphrase");
    }
    await setGateCookie();
    return back("");
  }

  if (op === "signup") {
    if (!(await hasGateCookie())) return back("fehler=passphrase");

    // Trim + collapse internal whitespace for display columns; the lookup keys
    // are derived from these via normalizeName below. Passwords are NOT
    // trimmed — taken as bytes for scrypt to preserve the user's intent.
    const firstName = String(fd.get("firstName") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const lastName = String(fd.get("lastName") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const password = String(fd.get("password") ?? "");
    const passwordRepeat = String(fd.get("passwordRepeat") ?? "");

    if (firstName.length < 1 || firstName.length > 60) {
      return back("fehler=validation");
    }
    if (lastName.length < 1 || lastName.length > 60) {
      return back("fehler=validation");
    }
    if (password.length < 8) return back("fehler=validation");
    if (password !== passwordRepeat) return back("fehler=mismatch");

    try {
      const [row] = await db
        .insert(users)
        .values({
          firstName,
          lastName,
          firstNameKey: normalizeName(firstName),
          lastNameKey: normalizeName(lastName),
          passwordHash: hashPassword(password),
        })
        .returning();
      if (!row) return back("fehler=validation");
      await setViewerSession(row);
      return NextResponse.redirect(`${origin}/spiele`, 303);
    } catch (e) {
      // Postgres unique-violation code on (first_name_key, last_name_key).
      // Confirm on first deliberate duplicate test that this field exists on
      // @neondatabase/serverless errors — if not, fall back to message match.
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code: string }).code === "23505"
      ) {
        return back("fehler=duplicate");
      }
      throw e;
    }
  }

  if (op === "login") {
    const firstName = String(fd.get("firstName") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const lastName = String(fd.get("lastName") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const password = String(fd.get("password") ?? "");

    if (!firstName || !lastName || !password) {
      // Still spend ~one scrypt on the miss path so trivial empty submissions
      // don't reveal anything via timing.
      verifyPassword(password, DUMMY_SCRYPT_HASH);
      return back("fehler=credentials");
    }

    const fnKey = normalizeName(firstName);
    const lnKey = normalizeName(lastName);
    const row = (
      await db
        .select()
        .from(users)
        .where(
          and(eq(users.firstNameKey, fnKey), eq(users.lastNameKey, lnKey)),
        )
        .limit(1)
    )[0];

    if (!row) {
      verifyPassword(password, DUMMY_SCRYPT_HASH);
      return back("fehler=credentials");
    }
    if (!verifyPassword(password, row.passwordHash)) {
      return back("fehler=credentials");
    }
    await setViewerSession(row);
    return NextResponse.redirect(`${origin}/spiele`, 303);
  }

  return back("fehler=validation");
}
