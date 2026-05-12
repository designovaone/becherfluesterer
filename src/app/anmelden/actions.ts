"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, settings, users } from "@/db";
import { setViewerSession, verifyPassword } from "@/lib/auth";

export async function anmeldenAction(formData: FormData) {
  const passphrase = String(formData.get("passphrase") ?? "");
  const rawName = String(formData.get("name") ?? "");
  const name = rawName.trim().replace(/\s+/g, " ");

  if (!passphrase || name.length < 2) {
    redirect("/anmelden?fehler=" + encodeURIComponent("Bitte alle Felder ausfüllen."));
  }

  const [cfg] = await db.select().from(settings).limit(1);
  if (!cfg) {
    redirect("/anmelden?fehler=" + encodeURIComponent("Seite noch nicht eingerichtet."));
  }

  if (!verifyPassword(passphrase, cfg.viewerPassphraseHash)) {
    redirect("/anmelden?fehler=" + encodeURIComponent("Passphrase falsch."));
  }

  // find-or-create user (case-insensitive uniqueness by display name)
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
    redirect(
      "/anmelden?fehler=" +
        encodeURIComponent("Konto konnte nicht angelegt werden."),
    );
  }

  await setViewerSession({ userId: user.id, name: user.name });
  redirect("/spiele");
}
