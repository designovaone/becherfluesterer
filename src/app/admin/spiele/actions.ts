"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, matches } from "@/db";
import { requireAdmin } from "@/lib/auth";

/** Treat the datetime-local string as Europe/Berlin local time. */
function berlinLocalToUTC(local: string): Date {
  // Compute UTC time so that, when interpreted in Europe/Berlin, it equals `local`.
  // We do this by guessing UTC, then correcting by the actual TZ offset.
  const naive = new Date(local + ":00Z"); // pretend it's UTC
  const berlinOffsetMin = getBerlinOffsetMinutes(naive);
  return new Date(naive.getTime() - berlinOffsetMin * 60_000);
}

function getBerlinOffsetMinutes(d: Date): number {
  // Returns minutes east of UTC for Europe/Berlin at the given instant.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    timeZoneName: "shortOffset",
  });
  const parts = dtf.formatToParts(d);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  // e.g. "GMT+2" or "GMT+02:00"
  const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tz);
  if (!m) return 60;
  const sign = m[1] === "-" ? -1 : 1;
  const h = Number(m[2] ?? 0);
  const mm = Number(m[3] ?? 0);
  return sign * (h * 60 + mm);
}

/** Convention: any team string `=== "Deutschland"` auto-opens betting. */
function isGermanyMatch(homeTeam: string, awayTeam: string): boolean {
  return homeTeam === "Deutschland" || awayTeam === "Deutschland";
}

export async function createMatch(formData: FormData) {
  await requireAdmin();
  const stage = String(formData.get("stage") ?? "").trim();
  const homeTeam = String(formData.get("homeTeam") ?? "").trim();
  const awayTeam = String(formData.get("awayTeam") ?? "").trim();
  const kickoff = String(formData.get("kickoff") ?? "").trim();
  if (!stage || !homeTeam || !awayTeam || !kickoff) {
    throw new Error("Alle Felder erforderlich.");
  }
  await db.insert(matches).values({
    stage,
    homeTeam,
    awayTeam,
    kickoffAt: berlinLocalToUTC(kickoff),
    bettingOpen: isGermanyMatch(homeTeam, awayTeam),
  });
  revalidatePath("/admin/spiele");
  revalidatePath("/");
  revalidatePath("/spiele");
}

export async function toggleBettingOpen(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("Ungültige ID.");
  const [m] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, id))
    .limit(1);
  if (!m) throw new Error("Spiel nicht gefunden.");
  await db
    .update(matches)
    .set({ bettingOpen: !m.bettingOpen })
    .where(eq(matches.id, id));
  revalidatePath("/admin/spiele");
  revalidatePath("/spiele");
  revalidatePath("/rangliste");
  revalidatePath("/");
}

export async function updateMatch(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const stage = String(formData.get("stage") ?? "").trim();
  const homeTeam = String(formData.get("homeTeam") ?? "").trim();
  const awayTeam = String(formData.get("awayTeam") ?? "").trim();
  const kickoff = String(formData.get("kickoff") ?? "").trim();
  if (!id || !stage || !homeTeam || !awayTeam || !kickoff) {
    throw new Error("Ungültige Eingaben.");
  }
  await db
    .update(matches)
    .set({
      stage,
      homeTeam,
      awayTeam,
      kickoffAt: berlinLocalToUTC(kickoff),
    })
    .where(eq(matches.id, id));
  revalidatePath("/admin/spiele");
  revalidatePath("/");
  revalidatePath("/spiele");
}

export async function setResult(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const hsRaw = String(formData.get("homeScore") ?? "");
  const asRaw = String(formData.get("awayScore") ?? "");
  const finalized = formData.get("finalized") === "on";

  const homeScore = hsRaw === "" ? null : Number(hsRaw);
  const awayScore = asRaw === "" ? null : Number(asRaw);

  if (
    (homeScore !== null && (!Number.isFinite(homeScore) || homeScore < 0)) ||
    (awayScore !== null && (!Number.isFinite(awayScore) || awayScore < 0))
  ) {
    throw new Error("Ungültiges Ergebnis.");
  }
  if (finalized && (homeScore === null || awayScore === null)) {
    throw new Error("Für endgültige Wertung beide Tore eintragen.");
  }

  await db
    .update(matches)
    .set({ homeScore, awayScore, finalized })
    .where(eq(matches.id, id));
  revalidatePath("/admin/spiele");
  revalidatePath("/spiele");
  revalidatePath("/rangliste");
}

export async function deleteMatch(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) throw new Error("Ungültige ID.");
  await db.delete(matches).where(eq(matches.id, id));
  revalidatePath("/admin/spiele");
  revalidatePath("/");
  revalidatePath("/spiele");
  revalidatePath("/rangliste");
}
