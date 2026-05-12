import { asc, eq } from "drizzle-orm";
import { db, matches, bets, users } from "@/db";
import { requireViewer } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import {
  BET_LOCK_MINUTES_BEFORE_KICKOFF,
  formatDateTime,
  formatEuro,
  isLocked,
} from "@/lib/format";
import { STAKE_EUR, payoutPerWinner, winnersOfMatch } from "@/lib/scoring";
import { placeBet } from "./actions";

export const dynamic = "force-dynamic";

export default async function SpielePage() {
  const session = await requireViewer();

  // Load all matches with their bets and bettor names
  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.kickoffAt));

  const allBets = await db
    .select({
      id: bets.id,
      matchId: bets.matchId,
      userId: bets.userId,
      predHome: bets.predHome,
      predAway: bets.predAway,
      userName: users.name,
    })
    .from(bets)
    .innerJoin(users, eq(bets.userId, users.id));

  const betsByMatch = new Map<number, typeof allBets>();
  for (const b of allBets) {
    if (!betsByMatch.has(b.matchId)) betsByMatch.set(b.matchId, []);
    betsByMatch.get(b.matchId)!.push(b);
  }

  return (
    <>
      <Nav name={session.name} />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="h-display text-4xl">Spiele &amp; Tipps</h1>
            <p className="text-sm text-forest-800/70 mt-1">
              Einsatz {formatEuro(STAKE_EUR)} pro Spiel
            </p>
          </div>
        </div>

        {/* Reminder banner */}
        <div className="mb-6 rounded-lg border border-amber_-500/30 bg-amber_-500/10 px-4 py-3 text-sm text-amber_-700 flex items-start gap-3">
          <span aria-hidden className="text-lg leading-none mt-0.5">⏱️</span>
          <div>
            <strong>
              Tipps werden {BET_LOCK_MINUTES_BEFORE_KICKOFF} Minuten vor Anpfiff
              automatisch gesperrt.
            </strong>{" "}
            Bei K.o.-Spielen zählt nur das Ergebnis nach 90 Minuten —
            Verlängerung und Elfmeterschießen werden für die Wertung ignoriert.
          </div>
        </div>

        <ol className="grid gap-4">
          {allMatches.length === 0 && (
            <li className="card p-8 text-center text-forest-800/70">
              Noch keine Spiele eingetragen. Der Admin pflegt den Spielplan.
            </li>
          )}

          {allMatches.map((m) => {
            const bettingOpen = m.bettingOpen;
            const locked = isLocked(m.kickoffAt);
            const finalized =
              m.finalized &&
              m.homeScore !== null &&
              m.awayScore !== null;

            const matchBets = bettingOpen ? betsByMatch.get(m.id) ?? [] : [];
            const myBet = matchBets.find((b) => b.userId === session.userId);

            // Winners only meaningful if finalized
            const winnerIds = finalized
              ? winnersOfMatch(
                  matchBets.map((b) => ({
                    userId: b.userId,
                    predHome: b.predHome,
                    predAway: b.predAway,
                  })),
                  m.homeScore!,
                  m.awayScore!,
                )
              : [];
            const winnerSet = new Set(winnerIds);
            const payout = finalized
              ? payoutPerWinner(matchBets.length, winnerIds.length)
              : 0;

            return (
              <li
                key={m.id}
                className={
                  "card overflow-hidden " +
                  (bettingOpen ? "" : "opacity-60")
                }
              >
                {/* HEAD */}
                <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-forest-800/10">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="chip">{m.stage}</span>
                    <span className="text-sm text-forest-800/70 tabular-nums">
                      {formatDateTime(m.kickoffAt)}
                    </span>
                  </div>
                  {!bettingOpen ? (
                    <span className="chip-closed">Wetten geschlossen</span>
                  ) : finalized ? (
                    <span className="chip bg-amber_-500/20 text-amber_-700">
                      Abgeschlossen · Topf {formatEuro(STAKE_EUR * matchBets.length)}
                    </span>
                  ) : locked ? (
                    <span className="chip-locked">Läuft / Gesperrt</span>
                  ) : (
                    <span className="chip">Tipps offen</span>
                  )}
                </div>

                {/* TEAMS */}
                <div className="px-5 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="text-right font-medium text-lg truncate">
                    {m.homeTeam}
                  </div>
                  <div className="text-center">
                    {finalized ? (
                      <div className="font-display text-3xl tabular-nums">
                        {m.homeScore}
                        <span className="text-forest-800/40 px-2">:</span>
                        {m.awayScore}
                      </div>
                    ) : (
                      <div className="text-forest-800/30 font-display text-2xl">
                        – : –
                      </div>
                    )}
                  </div>
                  <div className="text-left font-medium text-lg truncate">
                    {m.awayTeam}
                  </div>
                </div>

                {/* BET FORM or TIPS LIST */}
                <div className="px-5 pb-5">
                  {!bettingOpen && (
                    <div className="rounded-lg bg-parchment-100 border border-forest-800/10 p-4 text-sm text-forest-800/60 text-center">
                      Der Admin hat dieses Spiel nicht für Wetten freigegeben.
                    </div>
                  )}
                  {bettingOpen && !locked && (
                    <form
                      action={placeBet}
                      className="flex items-center justify-center gap-3 flex-wrap p-4 rounded-lg bg-parchment-100 border border-forest-800/10"
                    >
                      <input type="hidden" name="matchId" value={m.id} />
                      <span className="text-sm font-medium">
                        {myBet ? "Tipp ändern:" : "Tippen:"}
                      </span>
                      <input
                        type="number"
                        name="predHome"
                        min={0}
                        max={30}
                        defaultValue={myBet?.predHome ?? ""}
                        required
                        className="input w-20 text-center tabular-nums"
                        aria-label={`Tipp ${m.homeTeam}`}
                      />
                      <span className="text-forest-800/50">:</span>
                      <input
                        type="number"
                        name="predAway"
                        min={0}
                        max={30}
                        defaultValue={myBet?.predAway ?? ""}
                        required
                        className="input w-20 text-center tabular-nums"
                        aria-label={`Tipp ${m.awayTeam}`}
                      />
                      <button type="submit" className="btn-primary">
                        {myBet ? "Speichern" : "Tipp abgeben"}
                      </button>
                      {myBet && (
                        <span className="text-xs text-forest-800/60">
                          Dein bisheriger Tipp: {myBet.predHome}:{myBet.predAway}
                        </span>
                      )}
                    </form>
                  )}

                  {bettingOpen && locked && (
                    <div className="rounded-lg bg-parchment-100 border border-forest-800/10 p-4">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h3 className="text-xs uppercase tracking-widest text-forest-800/60 font-semibold">
                          Alle Tipps ({matchBets.length})
                        </h3>
                        {finalized && winnerIds.length > 0 && (
                          <span className="text-xs text-amber_-700">
                            Gewinn je Gewinner: {formatEuro(payout)}
                          </span>
                        )}
                      </div>

                      {matchBets.length === 0 ? (
                        <p className="text-sm text-forest-800/60">
                          Niemand hat getippt.
                        </p>
                      ) : (
                        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {matchBets
                            .slice()
                            .sort((a, b) =>
                              a.userName.localeCompare(b.userName, "de"),
                            )
                            .map((b) => {
                              const win = winnerSet.has(b.userId);
                              return (
                                <li
                                  key={b.id}
                                  className={
                                    "px-2.5 py-1.5 rounded text-sm flex items-center justify-between gap-2 " +
                                    (win
                                      ? "bg-amber_-500/20 ring-1 ring-amber_-500/40"
                                      : "bg-parchment-50")
                                  }
                                >
                                  <span className="truncate">
                                    {b.userName}
                                    {b.userId === session.userId && (
                                      <span className="text-forest-800/50">
                                        {" "}
                                        (du)
                                      </span>
                                    )}
                                  </span>
                                  <span className="tabular-nums font-semibold">
                                    {b.predHome}:{b.predAway}
                                  </span>
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </main>
      <Footer />
    </>
  );
}
