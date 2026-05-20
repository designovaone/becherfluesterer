import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, settings, users } from "@/db";
import { setViewerSession, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const passphrase = String(formData.get("passphrase") ?? "");
  const rawName = String(formData.get("name") ?? "");
  const name = rawName.trim().replace(/\s+/g, " ");
  const origin = new URL(req.url).origin;

  if (!passphrase || name.length < 2) {
    return NextResponse.redirect(
      `${origin}/anmelden?fehler=${encodeURIComponent("Bitte alle Felder ausfüllen.")}`,
      303,
    );
  }

  const [cfg] = await db.select().from(settings).limit(1);
  if (!cfg) {
    return NextResponse.redirect(
      `${origin}/anmelden?fehler=${encodeURIComponent("Seite noch nicht eingerichtet.")}`,
      303,
    );
  }

  if (!verifyPassword(passphrase, cfg.viewerPassphraseHash)) {
    return NextResponse.redirect(
      `${origin}/anmelden?fehler=${encodeURIComponent("Passphrase falsch.")}`,
      303,
    );
  }

  let user = (
    await db.select().from(users).where(eq(users.name, name)).limit(1)
  )[0];

  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ name })
      .onConflictDoNothing()
      .returning();
    user =
      inserted[0] ??
      (await db.select().from(users).where(eq(users.name, name)).limit(1))[0];
  }

  if (!user) {
    return NextResponse.redirect(
      `${origin}/anmelden?fehler=${encodeURIComponent("Konto konnte nicht angelegt werden.")}`,
      303,
    );
  }

  await setViewerSession({ userId: user.id, name: user.name });
  return NextResponse.redirect(`${origin}/spiele`, 303);
}
