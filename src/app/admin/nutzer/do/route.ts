import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { isAdmin } from "@/lib/auth";

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

  return fail("Unbekannte Aktion.");
}
