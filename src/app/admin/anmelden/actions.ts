"use server";

import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { db, settings } from "@/db";
import { setAdminSession, verifyPassword } from "@/lib/auth";

/** Konstant-Zeit-Vergleich zweier Strings (Hash-basiert, kein Längen-Leak). */
function constEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function adminLoginAction(formData: FormData) {
  const pw = String(formData.get("pw") ?? "");
  if (!pw) {
    redirect("/admin/anmelden?fehler=" + encodeURIComponent("Passwort fehlt."));
  }

  // Recovery-Pfad: ADMIN_PASSWORD aus den Env-Vars wird immer akzeptiert.
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw && constEqual(pw, envPw)) {
    await setAdminSession();
    redirect("/admin/spiele");
  }

  const [cfg] = await db.select().from(settings).limit(1);
  if (!cfg) {
    redirect("/einrichten");
  }
  if (!verifyPassword(pw, cfg.adminPasswordHash)) {
    redirect("/admin/anmelden?fehler=" + encodeURIComponent("Passwort falsch."));
  }
  await setAdminSession();
  redirect("/admin/spiele");
}
