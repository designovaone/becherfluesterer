import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, bets, matches, users } from "@/db";
import { getViewerSession, isAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import {
  STAKE_EUR,
  payoutPerWinner,
  winnersOfMatch,
} from "@/lib/scoring";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  userId: number;
  name: string;
  bets: number;
  wins: number;
  winnings: number;
};

export default async function RanglistePage() {
  // Viewer ODER Admin darf rein. Kein Highlight für Admin-only.
  const viewer = await getViewerSession();
  const admin = await isAdmin();
  if (!viewer && !admin) redirect("/anmelden");
  const session = viewer ?? { userId: -1, name: "Admin" };
  const isAdminOnly = !viewer && admin;

  const allUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users);
  const allMatches = await db.select().from(matches).orderBy(asc(matches.id));
  const rawBets = await db.select().from(bets);

  // Bets on matches the admin has not opened for betting don't count.
  const openMatchIds = new Set(
    allMatches.filter((m) => m.bettingOpen).map((m) => m.id),
  );
  const allBets = rawBets.filter((b) => openMatchIds.has(b.matchId));

  const byMatch = new Map<number, typeof allBets>();
  for (const b of allBets) {
    if (!byMatch.has(b.matchId)) byMatch.set(b.matchId, []);
    byMatch.get(b.matchId)!.push(b);
  }

  const stats = new Map<number, Row>();
  for (const u of allUsers) {
    stats.set(u.id, {
      userId: u.id,
      name: u.name,
      bets: 0,
      wins: 0,
      winnings: 0,
    });
  }

  // bets placed
  for (const b of allBets) {
    const row = stats.get(b.userId);
    if (row) row.bets += 1;
  }

  // wins + winnings (only for finalized matches that were open for betting)
  for (const m of allMatches) {
    if (
      !m.bettingOpen ||
      !m.finalized ||
      m.homeScore === null ||
      m.awayScore === null
    )
      continue;

    const ms = byMatch.get(m.id) ?? [];
    if (ms.length === 0) continue;

    const winners = winnersOfMatch(
      ms.map((b) => ({
        userId: b.userId,
        predHome: b.predHome,
        predAway: b.predAway,
      })),
      m.homeScore,
      m.awayScore,
    );
    if (winners.length === 0) continue;

    const payout = payoutPerWinner(ms.length, winners.length);
    for (const id of winners) {
      const row = stats.get(id);
      if (!row) continue;
      row.wins += 1;
      row.winnings += payout;
    }
  }

  const rows = Array.from(stats.values()).sort(
    (a, b) =>
      b.winnings - a.winnings || b.wins - a.wins || b.bets - a.bets ||
      a.name.localeCompare(b.name, "de"),
  );

  const totalPot = STAKE_EUR * allBets.length;
  const adminCut = totalPot / 2;

  return (
    <>
      <Nav name={viewer?.name} admin={isAdminOnly} />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="h-display text-4xl mb-1">Rangliste</h1>
        <p className="text-sm text-forest-800/70 mb-6">
          Bisher gesetzt: {formatEuro(totalPot)} · Party-Kasse (50 %):{" "}
          {formatEuro(adminCut)}
        </p>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200/70">
              <tr className="text-left">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Tipps</th>
                <th className="px-4 py-3 text-right">Gewonnen</th>
                <th className="px-4 py-3 text-right">Gewinn</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-forest-800/60">
                    Noch keine Mitglieder.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const me = r.userId === session.userId;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <tr
                    key={r.userId}
                    className={
                      "border-t border-forest-800/10 " +
                      (me ? "bg-amber_-500/10" : "")
                    }
                  >
                    <td className="px-4 py-3 tabular-nums">
                      {medal ?? i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {r.name}
                      {me && (
                        <span className="text-forest-800/50"> (du)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.bets}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.wins}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatEuro(r.winnings)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-forest-800/60">
          Wertung: Exakter Tipp gewinnt. Falls niemand exakt tippt, gewinnt
          die kleinste Tordifferenz. Mehrere Gewinner teilen den
          ausschüttbaren Topf zu gleichen Teilen.
        </p>
      </main>
      <Footer />
    </>
  );
}
