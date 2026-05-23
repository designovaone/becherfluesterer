import { asc, eq } from "drizzle-orm";
import { db, matches, bets, users } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatDateTime } from "@/lib/format";
import { winnersOfMatch } from "@/lib/scoring";
export const dynamic = "force-dynamic";

const STAGES = [
  "Gruppenphase",
  "Achtelfinale",
  "Viertelfinale",
  "Halbfinale",
  "Spiel um Platz 3",
  "Finale",
];

function toLocalInput(d: Date) {
  // YYYY-MM-DDTHH:mm in Europe/Berlin
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(d)
    .replace(" ", "T");
  return parts;
}

export default async function AdminSpielePage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  await requireAdmin();
  const { fehler } = await searchParams;

  const list = await db.select().from(matches).orderBy(asc(matches.kickoffAt));

  const allBetsRaw = await db
    .select({
      id: bets.id,
      matchId: bets.matchId,
      userId: bets.userId,
      predHome: bets.predHome,
      predAway: bets.predAway,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(bets)
    .innerJoin(users, eq(bets.userId, users.id));
  const allBets = allBetsRaw.map((b) => ({
    ...b,
    userName: `${b.firstName} ${b.lastName}`,
  }));

  const betsByMatch = new Map<number, typeof allBets>();
  for (const b of allBets) {
    if (!betsByMatch.has(b.matchId)) betsByMatch.set(b.matchId, []);
    betsByMatch.get(b.matchId)!.push(b);
  }

  return (
    <>
      <Nav admin />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="h-display text-4xl mb-1">Spielplan verwalten</h1>
        <p className="text-sm text-forest-800/70 mb-6">
          Neue Spiele anlegen, Ergebnisse eintragen, jederzeit korrigieren.
        </p>

        {fehler && (
          <div className="mb-4 rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
            {fehler}
          </div>
        )}

        {/* CREATE */}
        <section className="card p-5 mb-8">
          <h2 className="font-display text-2xl mb-4">Neues Spiel</h2>
          <form
            action="/admin/spiele/do"
            method="POST"
            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end"
          >
            <input type="hidden" name="op" value="create" />
            <div>
              <label className="label" htmlFor="stage">Phase</label>
              <select id="stage" name="stage" className="input" defaultValue="Gruppenphase">
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="homeTeam">Team 1</label>
              <input
                id="homeTeam"
                name="homeTeam"
                className="input"
                placeholder="z. B. Deutschland"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="awayTeam">Team 2</label>
              <input
                id="awayTeam"
                name="awayTeam"
                className="input"
                placeholder="z. B. Mexiko"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="kickoff">Anpfiff (Europa/Berlin)</label>
              <input
                id="kickoff"
                name="kickoff"
                type="datetime-local"
                className="input tabular-nums"
                required
              />
            </div>
            <button type="submit" className="btn-primary">Anlegen</button>
          </form>
        </section>

        {/* LIST */}
        <section className="grid gap-4">
          {list.length === 0 && (
            <div className="card p-8 text-center text-forest-800/60">
              Keine Spiele vorhanden.
            </div>
          )}

          {list.map((m) => {
            const matchBets = betsByMatch.get(m.id) ?? [];
            const finalized =
              m.finalized && m.homeScore !== null && m.awayScore !== null;
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
            return (
            <article key={m.id} className="card p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="chip">{m.stage}</span>
                  <span className="text-sm text-forest-800/70">
                    {formatDateTime(m.kickoffAt)}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <form action="/admin/spiele/do" method="POST">
                    <input type="hidden" name="op" value="toggle" />
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className={m.bettingOpen ? "chip-open" : "chip-closed"}
                      title={
                        m.bettingOpen
                          ? "Klicken, um Wetten zu sperren"
                          : "Klicken, um Wetten freizugeben"
                      }
                    >
                      {m.bettingOpen ? "✓ Wetten offen" : "Wetten geschlossen"}
                    </button>
                  </form>
                  <form action="/admin/spiele/do" method="POST">
                    <input type="hidden" name="op" value="delete" />
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="text-xs text-wine hover:underline"
                    >
                      Spiel löschen
                    </button>
                  </form>
                </div>
              </div>

              {/* Edit basics */}
              <form
                action="/admin/spiele/do"
                method="POST"
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end"
              >
                <input type="hidden" name="op" value="update" />
                <input type="hidden" name="id" value={m.id} />
                <div>
                  <label className="label">Phase</label>
                  <select name="stage" className="input" defaultValue={m.stage}>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Team 1</label>
                  <input name="homeTeam" defaultValue={m.homeTeam} className="input" required />
                </div>
                <div>
                  <label className="label">Team 2</label>
                  <input name="awayTeam" defaultValue={m.awayTeam} className="input" required />
                </div>
                <div>
                  <label className="label">Anpfiff</label>
                  <input
                    name="kickoff"
                    type="datetime-local"
                    defaultValue={toLocalInput(m.kickoffAt)}
                    className="input tabular-nums"
                    required
                  />
                </div>
                <button type="submit" className="btn-secondary">Speichern</button>
              </form>

              {/* Result */}
              <form
                action="/admin/spiele/do"
                method="POST"
                className="mt-4 pt-4 border-t border-forest-800/10"
              >
                <input type="hidden" name="op" value="result" />
                <input type="hidden" name="id" value={m.id} />
                {m.stage !== "Gruppenphase" && (
                  <p className="mb-3 text-xs text-amber_-700">
                    K.o.-Spiel: <strong>nur das Ergebnis nach 90 Minuten</strong>{" "}
                    eintragen. Verlängerung und Elfmeterschießen zählen für die
                    Wertung nicht.
                  </p>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                <span className="label !mb-0 mr-1">Ergebnis</span>
                <input
                  type="number"
                  name="homeScore"
                  min={0}
                  max={30}
                  defaultValue={m.homeScore ?? ""}
                  className="input w-20 text-center tabular-nums"
                  placeholder="–"
                />
                <span className="text-forest-800/50">:</span>
                <input
                  type="number"
                  name="awayScore"
                  min={0}
                  max={30}
                  defaultValue={m.awayScore ?? ""}
                  className="input w-20 text-center tabular-nums"
                  placeholder="–"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="finalized"
                    defaultChecked={m.finalized}
                    className="size-4 accent-forest-800"
                  />
                  Endgültig (wertet die Tipps aus)
                </label>
                <button type="submit" className="btn-amber">Ergebnis speichern</button>
                </div>
              </form>

              {/* Tipps der Mitglieder */}
              <div className="mt-4 pt-4 border-t border-forest-800/10">
                <h3 className="label !mb-2">
                  Tipps der Mitglieder ({matchBets.length})
                </h3>
                {matchBets.length === 0 ? (
                  <p className="text-sm text-forest-800/60">
                    Noch keine Tipps abgegeben.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {matchBets
                      .slice()
                      .sort((a, b) => a.userName.localeCompare(b.userName, "de"))
                      .map((b) => {
                        const win = winnerSet.has(b.userId);
                        return (
                          <li
                            key={b.id}
                            className={
                              "px-2.5 py-1.5 rounded text-sm flex items-center justify-between gap-2 " +
                              (win
                                ? "bg-amber_-500/20 ring-1 ring-amber_-500/40"
                                : "bg-parchment-100")
                            }
                          >
                            <span className="truncate">{b.userName}</span>
                            <span className="tabular-nums font-semibold">
                              {b.predHome}:{b.predAway}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </article>
            );
          })}
        </section>
      </main>
      <Footer />
    </>
  );
}
