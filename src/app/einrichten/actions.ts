"use server";

import { redirect } from "next/navigation";
import { db, settings } from "@/db";
import { count } from "drizzle-orm";
import { hashPassword, setAdminSession } from "@/lib/auth";

export async function setupAction(formData: FormData) {
  const admin = String(formData.get("admin") ?? "");
  const viewer = String(formData.get("viewer") ?? "");
  if (admin.length < 8 || viewer.length < 6) {
    throw new Error("Eingaben zu kurz.");
  }

  const rows = await db.select({ c: count() }).from(settings);
  if ((rows[0]?.c ?? 0) > 0) {
    redirect("/");
  }

  await db.insert(settings).values({
    id: 1,
    viewerPassphraseHash: hashPassword(viewer),
    adminPasswordHash: hashPassword(admin),
  });

  await setAdminSession();
  redirect("/admin/spiele");
}
