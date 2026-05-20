import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, matches } from "@/db";
import { isAdmin } from "@/lib/auth";

function berlinLocalToUTC(local: string): Date {
  const naive = new Date(local + ":00Z");
  const berlinOffsetMin = getBerlinOffsetMinutes(naive);
  return new Date(naive.getTime() - berlinOffsetMin * 60_000);
}

function getBerlinOffsetMinutes(d: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    timeZoneName: "shortOffset",
  });
  const parts = dtf.formatToParts(d);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tz);
  if (!m) return 60;
  const sign = m[1] === "-" ? -1 : 1;
  const h = Number(m[2] ?? 0);
  const mm = Number(m[3] ?? 0);
  return sign * (h * 60 + mm);
}

function isGermanyMatch(homeTeam: string, awayTeam: string): boolean {
  return homeTeam === "Deutschland" || awayTeam === "Deutschland";
}

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  if (!(await isAdmin())) {
    return NextResponse.redirect(`${origin}/admin/anmelden`, 303);
  }

  const fd = await req.formData();
  const op = String(fd.get("op") ?? "");
  const back = `${origin}/admin/spiele`;
  const fail = (msg: string) =>
    NextResponse.redirect(`${back}?fehler=${encodeURIComponent(msg)}`, 303);

  if (op === "create") {
    const stage = String(fd.get("stage") ?? "").trim();
    const homeTeam = String(fd.get("homeTeam") ?? "").trim();
    const awayTeam = String(fd.get("awayTeam") ?? "").trim();
    const kickoff = String(fd.get("kickoff") ?? "").trim();
    if (!stage || !homeTeam || !awayTeam || !kickoff) {
      return fail("Alle Felder erforderlich.");
    }
    await db.insert(matches).values({
      stage,
      homeTeam,
      awayTeam,
      kickoffAt: berlinLocalToUTC(kickoff),
      bettingOpen: isGermanyMatch(homeTeam, awayTeam),
    });
    return NextResponse.redirect(back, 303);
  }

  if (op === "toggle") {
    const id = Number(fd.get("id"));
    if (!id) return fail("Ungültige ID.");
    const [m] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);
    if (!m) return fail("Spiel nicht gefunden.");
    await db
      .update(matches)
      .set({ bettingOpen: !m.bettingOpen })
      .where(eq(matches.id, id));
    return NextResponse.redirect(back, 303);
  }

  if (op === "update") {
    const id = Number(fd.get("id"));
    const stage = String(fd.get("stage") ?? "").trim();
    const homeTeam = String(fd.get("homeTeam") ?? "").trim();
    const awayTeam = String(fd.get("awayTeam") ?? "").trim();
    const kickoff = String(fd.get("kickoff") ?? "").trim();
    if (!id || !stage || !homeTeam || !awayTeam || !kickoff) {
      return fail("Ungültige Eingaben.");
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
    return NextResponse.redirect(back, 303);
  }

  if (op === "result") {
    const id = Number(fd.get("id"));
    const hsRaw = String(fd.get("homeScore") ?? "");
    const asRaw = String(fd.get("awayScore") ?? "");
    const finalized = fd.get("finalized") === "on";
    const homeScore = hsRaw === "" ? null : Number(hsRaw);
    const awayScore = asRaw === "" ? null : Number(asRaw);
    if (
      (homeScore !== null && (!Number.isFinite(homeScore) || homeScore < 0)) ||
      (awayScore !== null && (!Number.isFinite(awayScore) || awayScore < 0))
    ) {
      return fail("Ungültiges Ergebnis.");
    }
    if (finalized && (homeScore === null || awayScore === null)) {
      return fail("Für endgültige Wertung beide Tore eintragen.");
    }
    await db
      .update(matches)
      .set({ homeScore, awayScore, finalized })
      .where(eq(matches.id, id));
    return NextResponse.redirect(back, 303);
  }

  if (op === "delete") {
    const id = Number(fd.get("id"));
    if (!id) return fail("Ungültige ID.");
    await db.delete(matches).where(eq(matches.id, id));
    return NextResponse.redirect(back, 303);
  }

  return fail("Unbekannte Aktion.");
}
