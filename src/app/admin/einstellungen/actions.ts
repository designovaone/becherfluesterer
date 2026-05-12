"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, settings } from "@/db";
import { hashPassword, requireAdmin, verifyPassword } from "@/lib/auth";

export async function updateViewerPassphrase(formData: FormData) {
  await requireAdmin();
  const newViewer = String(formData.get("newViewer") ?? "");
  if (newViewer.length < 6) {
    redirect("/admin/einstellungen?fehler=" + encodeURIComponent("Passphrase zu kurz."));
  }
  await db
    .update(settings)
    .set({ viewerPassphraseHash: hashPassword(newViewer) })
    .where(eq(settings.id, 1));
  redirect("/admin/einstellungen?ok=" + encodeURIComponent("Passphrase aktualisiert."));
}

export async function updateAdminPassword(formData: FormData) {
  await requireAdmin();
  const current = String(formData.get("currentAdmin") ?? "");
  const next = String(formData.get("newAdmin") ?? "");
  if (next.length < 8) {
    redirect("/admin/einstellungen?fehler=" + encodeURIComponent("Neues Passwort zu kurz."));
  }
  const [cfg] = await db.select().from(settings).limit(1);
  if (!cfg || !verifyPassword(current, cfg.adminPasswordHash)) {
    redirect("/admin/einstellungen?fehler=" + encodeURIComponent("Aktuelles Passwort falsch."));
  }
  await db
    .update(settings)
    .set({ adminPasswordHash: hashPassword(next) })
    .where(eq(settings.id, 1));
  redirect("/admin/einstellungen?ok=" + encodeURIComponent("Passwort geändert."));
}
