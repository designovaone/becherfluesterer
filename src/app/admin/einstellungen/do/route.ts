import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, settings } from "@/db";
import { hashPassword, isAdmin, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  if (!(await isAdmin())) {
    return NextResponse.redirect(`${origin}/admin/anmelden`, 303);
  }

  const fd = await req.formData();
  const op = String(fd.get("op") ?? "");
  const back = `${origin}/admin/einstellungen`;
  const fail = (msg: string) =>
    NextResponse.redirect(`${back}?fehler=${encodeURIComponent(msg)}`, 303);
  const ok = (msg: string) =>
    NextResponse.redirect(`${back}?ok=${encodeURIComponent(msg)}`, 303);

  if (op === "passphrase") {
    const newViewer = String(fd.get("newViewer") ?? "");
    if (newViewer.length < 6) return fail("Passphrase zu kurz.");
    await db
      .update(settings)
      .set({ viewerPassphraseHash: hashPassword(newViewer) })
      .where(eq(settings.id, 1));
    return ok("Passphrase aktualisiert.");
  }

  if (op === "admin") {
    const current = String(fd.get("currentAdmin") ?? "");
    const next = String(fd.get("newAdmin") ?? "");
    if (next.length < 8) return fail("Neues Passwort zu kurz.");
    const [cfg] = await db.select().from(settings).limit(1);
    if (!cfg || !verifyPassword(current, cfg.adminPasswordHash)) {
      return fail("Aktuelles Passwort falsch.");
    }
    await db
      .update(settings)
      .set({ adminPasswordHash: hashPassword(next) })
      .where(eq(settings.id, 1));
    return ok("Passwort geändert.");
  }

  return fail("Unbekannte Aktion.");
}
