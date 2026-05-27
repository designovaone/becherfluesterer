import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, championBets, settings } from "@/db";
import { getViewerUser } from "@/lib/auth";
import { championBettingClosed } from "@/lib/format";
import { WM2026_TEAMS } from "@/lib/teams";

function fail(origin: string, msg: string) {
  return NextResponse.redirect(
    `${origin}/weltmeister?fehler=${encodeURIComponent(msg)}`,
    303,
  );
}

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;

  const user = await getViewerUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/anmelden`, 303);
  }

  const fd = await req.formData();
  const team = String(fd.get("team") ?? "").trim();
  if (!WM2026_TEAMS.includes(team)) {
    return fail(origin, "Bitte ein gültiges Land wählen.");
  }

  // Re-check the cutoff from the DB at POST time (the page form is only a hint).
  const [cfg] = await db.select().from(settings).limit(1);
  if (championBettingClosed(cfg?.championCutoffAt)) {
    return fail(
      origin,
      "Die Wetten für den Weltmeister-Tipp sind geschlossen.",
    );
  }

  const existing = (
    await db
      .select()
      .from(championBets)
      .where(eq(championBets.userId, user.id))
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(championBets)
      .set({ team, updatedAt: new Date() })
      .where(eq(championBets.id, existing.id));
  } else {
    try {
      await db.insert(championBets).values({ userId: user.id, team });
    } catch (e: unknown) {
      // Concurrent first insert lost the race against the user_id unique index.
      // The other request already created the row — treat as success, not 500.
      const code = (e as { cause?: { code?: string } })?.cause?.code;
      if (code !== "23505") throw e;
    }
  }

  return NextResponse.redirect(`${origin}/weltmeister`, 303);
}
