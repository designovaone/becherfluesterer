import { NextResponse, type NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { db, settings } from "@/db";
import { setAdminSession, verifyPassword } from "@/lib/auth";

function constEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const pw = String(formData.get("pw") ?? "");
  const origin = new URL(req.url).origin;

  if (!pw) {
    return NextResponse.redirect(
      `${origin}/admin/anmelden?fehler=${encodeURIComponent("Passwort fehlt.")}`,
      303,
    );
  }

  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw && constEqual(pw, envPw)) {
    await setAdminSession();
    return NextResponse.redirect(`${origin}/admin/spiele`, 303);
  }

  const [cfg] = await db.select().from(settings).limit(1);
  if (!cfg) {
    return NextResponse.redirect(`${origin}/einrichten`, 303);
  }
  if (!verifyPassword(pw, cfg.adminPasswordHash)) {
    return NextResponse.redirect(
      `${origin}/admin/anmelden?fehler=${encodeURIComponent("Passwort falsch.")}`,
      303,
    );
  }

  await setAdminSession();
  return NextResponse.redirect(`${origin}/admin/spiele`, 303);
}
