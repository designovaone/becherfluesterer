"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, bets, matches } from "@/db";
import { requireViewer } from "@/lib/auth";
import { BET_LOCK_MINUTES_BEFORE_KICKOFF, isLocked } from "@/lib/format";

export async function placeBet(formData: FormData) {
  const session = await requireViewer();

  const matchId = Number(formData.get("matchId"));
  const predHome = Number(formData.get("predHome"));
  const predAway = Number(formData.get("predAway"));

  if (!Number.isFinite(matchId) || matchId <= 0) {
    throw new Error("Ungültiges Spiel.");
  }
  if (
    !Number.isFinite(predHome) ||
    !Number.isFinite(predAway) ||
    predHome < 0 ||
    predAway < 0 ||
    predHome > 30 ||
    predAway > 30
  ) {
    throw new Error("Ungültiger Tipp (0–30).");
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) throw new Error("Spiel nicht gefunden.");
  if (!match.bettingOpen) {
    throw new Error("Für dieses Spiel sind Wetten nicht freigegeben.");
  }
  if (isLocked(match.kickoffAt)) {
    throw new Error(
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

  revalidatePath("/spiele");
}
