import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, bets, matches } from "@/db";
import { getViewerSession } from "@/lib/auth";
import { BET_LOCK_MINUTES_BEFORE_KICKOFF, isLocked } from "@/lib/format";

function fail(origin: string, msg: string) {
  return NextResponse.redirect(
    `${origin}/spiele?fehler=${encodeURIComponent(msg)}`,
    303,
  );
}

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;

  const session = await getViewerSession();
  if (!session) {
    return NextResponse.redirect(`${origin}/anmelden`, 303);
  }

  const formData = await req.formData();
  const matchId = Number(formData.get("matchId"));
  const predHome = Number(formData.get("predHome"));
  const predAway = Number(formData.get("predAway"));

  if (!Number.isFinite(matchId) || matchId <= 0) {
    return fail(origin, "Ungültiges Spiel.");
  }
  if (
    !Number.isFinite(predHome) ||
    !Number.isFinite(predAway) ||
    predHome < 0 ||
    predAway < 0 ||
    predHome > 30 ||
    predAway > 30
  ) {
    return fail(origin, "Ungültiger Tipp (0–30).");
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return fail(origin, "Spiel nicht gefunden.");
  if (!match.bettingOpen) {
    return fail(origin, "Für dieses Spiel sind Wetten nicht freigegeben.");
  }
  if (isLocked(match.kickoffAt)) {
    return fail(
      origin,
      `Tipps werden ${BET_LOCK_MINUTES_BEFORE_KICKOFF} Minuten vor Anpfiff gesperrt.`,
    );
  }

  const existing = (
    await db
      .select()
      .from(bets)
      .where(and(eq(bets.userId, session.userId), eq(bets.matchId, matchId)))
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(bets)
      .set({ predHome, predAway, updatedAt: new Date() })
      .where(eq(bets.id, existing.id));
  } else {
    await db.insert(bets).values({
      userId: session.userId,
      matchId,
      predHome,
      predAway,
    });
  }

  return NextResponse.redirect(`${origin}/spiele`, 303);
}
