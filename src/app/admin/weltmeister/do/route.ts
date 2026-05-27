import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, settings } from "@/db";
import { isAdmin } from "@/lib/auth";
import { WM2026_TEAMS } from "@/lib/teams";

// DUPLICATED from admin/spiele/do/route.ts (per spec v2 Q2 — do not extract).
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

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  if (!(await isAdmin())) {
    return NextResponse.redirect(`${origin}/admin/anmelden`, 303);
  }

  const fd = await req.formData();
  const op = String(fd.get("op") ?? "");
  const back = `${origin}/admin/weltmeister`;
  const fail = (msg: string) =>
    NextResponse.redirect(`${back}?fehler=${encodeURIComponent(msg)}`, 303);
  const ok = (msg: string) =>
    NextResponse.redirect(`${back}?ok=${encodeURIComponent(msg)}`, 303);

  if (op === "cutoff") {
    const kickoff = String(fd.get("kickoff") ?? "").trim();
    if (!kickoff) return fail("Bitte einen Wett-Schluss angeben.");
    await db
      .update(settings)
      .set({ championCutoffAt: berlinLocalToUTC(kickoff) })
      .where(eq(settings.id, 1));
    return ok("Wett-Schluss aktualisiert.");
  }

  if (op === "winner") {
    const team = String(fd.get("winner") ?? "").trim();
    if (team !== "" && !WM2026_TEAMS.includes(team)) {
      return fail("Bitte ein gültiges Land wählen.");
    }
    await db
      .update(settings)
      .set({ championWinner: team === "" ? null : team })
      .where(eq(settings.id, 1));
    return ok(
      team === "" ? "Weltmeister zurückgesetzt (noch offen)." : `Weltmeister: ${team}.`,
    );
  }

  return fail("Unbekannte Aktion.");
}
