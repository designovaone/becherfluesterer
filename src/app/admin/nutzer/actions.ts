"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function deleteUser(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("Ungültige ID.");
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/nutzer");
  revalidatePath("/rangliste");
  revalidatePath("/spiele");
}
