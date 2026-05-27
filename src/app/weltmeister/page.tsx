import { count, eq } from "drizzle-orm";
import { db, championBets, settings, users } from "@/db";
import { requireViewer } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { championBettingClosed, formatDateTime, formatEuro } from "@/lib/format";
import { CHAMPION_STAKE_EUR, payoutPerWinner } from "@/lib/scoring";
import { WM2026_TEAMS } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function WeltmeisterPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  const session = await requireViewer();
  const { fehler } = await searchParams;

  const [cfg] = await db.select().from(settings).limit(1);
  const cutoff = cfg?.championCutoffAt ?? null;
  const winner = cfg?.championWinner ?? null;
  const closed = championBettingClosed(cutoff);

  // --- B2 gating: branch the QUERY, not the render. ---
  // Open: load ONLY the viewer's own pick + a neutral entrant count.
  // Closed: load every pick with names. Never load-all-then-branch.
  let myTeam: string | null = null;
  let entrants = 0;
  let allPicks: {
    userId: number;
    firstName: string;
    lastName: string;
    team: string;
  }[] = [];

  if (closed) {
    allPicks = await db
      .select({
        userId: championBets.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        team: championBets.team,
      })
      .from(championBets)
      .innerJoin(users, eq(championBets.userId, users.id));
    entrants = allPicks.length;
    myTeam = allPicks.find((p) => p.userId === session.id)?.team ?? null;
  } else {
    const mine = (
      await db
        .select({ team: championBets.team })
        .from(championBets)
        .where(eq(championBets.userId, session.id))
        .limit(1)
    )[0];
    myTeam = mine?.team ?? null;
    const [cnt] = await db
      .select({ value: count() })
      .from(championBets);
    entrants = cnt?.value ?? 0;
  }

  const pot = CHAMPION_STAKE_EUR * entrants;
  const partyKasse = pot / 2;
  const distributable = pot / 2;

  const sortedPicks = allPicks
    .slice()
    .sort((a, b) => a.firstName.localeCompare(b.firstName, "de"));
  const numWinners = winner
    ? sortedPicks.filter((p) => p.team === winner).length
    : 0;
  const payout = winner
    ? payoutPerWinner(entrants, numWinners, CHAMPION_STAKE_EUR)
    : 0;

  return (
    <>
      <Nav name={`${session.firstName} ${session.lastName}`} />
      <main className="max-w-md mx-auto px-5 py-10">
        <div className="mb-4">
          <h1 className="h-display text-4xl">Weltmeister-Tipp</h1>
          <p className="text-sm text-forest-800/70 mt-1">
            Einsatz {formatEuro(CHAMPION_STAKE_EUR)} · ein Tipp für das ganze
            Turnier
          </p>
        </div>

        {fehler && (
          <div className="mb-4 rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
            {fehler}
          </div>
        )}

        {/* Rules / cutoff banner */}
        <div className="mb-6 rounded-lg border border-amber_-500/30 bg-amber_-500/10 px-4 py-3 text-sm text-amber_-700 flex items-start gap-3">
          <span aria-hidden className="text-lg leading-none mt-0.5">🏆</span>
          <div className="space-y-1">
            <p>
              <strong>Tippe, wer Weltmeister 2026 wird.</strong> Einsatz{" "}
              {formatEuro(CHAMPION_STAKE_EUR)} — die Hälfte geht in den Topf, die
              andere Hälfte in die Party-Kasse.
            </p>
            <p>
              Die Wetten schließen am{" "}
              {cutoff ? <strong>{formatDateTime(cutoff)}</strong> : "—"}. Bis dahin
              siehst du nur deinen eigenen Tipp, danach alle.
            </p>
          </div>
        </div>

        {!closed ? (
          <section className="card p-5">
            <form
              action="/weltmeister/tipp"
              method="POST"
              className="grid gap-3"
            >
              <div>
                <label className="label" htmlFor="team">
                  Dein Weltmeister-Tipp
                </label>
                <select
                  id="team"
                  name="team"
                  className="input"
                  defaultValue={myTeam ?? ""}
                  required
                >
                  <option value="" disabled>
                    — Land wählen —
                  </option>
                  {WM2026_TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">
                {myTeam ? "Tipp ändern" : "Tipp abgeben"}
              </button>
            </form>

            {myTeam && (
              <p className="mt-3 text-sm text-forest-800/70">
                Dein Tipp: <strong>{myTeam}</strong>
              </p>
            )}
            <p className="mt-3 text-sm text-forest-800/60">
              {entrants === 1
                ? "1 Mitglied hat schon getippt."
                : `${entrants} Mitglieder haben schon getippt.`}
            </p>
          </section>
        ) : (
          <section className="card p-5">
            {winner ? (
              <div className="mb-4 text-center">
                <p className="font-display text-2xl">🏆 Weltmeister: {winner}</p>
                {numWinners > 0 ? (
                  <p className="mt-1 text-sm text-amber_-700">
                    Gewinn je Gewinner: {formatEuro(payout)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-forest-800/60">
                    Niemand hat dieses Land getippt.
                  </p>
                )}
              </div>
            ) : (
              <p className="mb-4 text-center text-sm text-forest-800/60">
                Die Wetten sind geschlossen. Der Sieger wird nach dem Finale
                eingetragen.
              </p>
            )}

            <h2 className="label !mb-2">Alle Tipps ({entrants})</h2>
            {sortedPicks.length === 0 ? (
              <p className="text-sm text-forest-800/60">Niemand hat getippt.</p>
            ) : (
              <ul className="grid gap-1.5">
                {sortedPicks.map((p) => {
                  const win = winner !== null && p.team === winner;
                  return (
                    <li
                      key={p.userId}
                      className={
                        "px-2.5 py-1.5 rounded text-sm flex items-center justify-between gap-2 " +
                        (win
                          ? "bg-amber_-500/20 ring-1 ring-amber_-500/40"
                          : "bg-parchment-100")
                      }
                    >
                      <span className="truncate">
                        {p.firstName} {p.lastName}
                        {p.userId === session.id && (
                          <span className="text-forest-800/50"> (du)</span>
                        )}
                      </span>
                      <span className="font-semibold">{p.team}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 pt-4 border-t border-forest-800/10 text-xs text-forest-800/60">
              Topf gesamt {formatEuro(pot)} · Party-Kasse (50 %){" "}
              {formatEuro(partyKasse)} · ausschüttbar {formatEuro(distributable)}.
              Bei mehreren Gewinnern wird zu gleichen Teilen geteilt; die
              Auszahlung wird bar abgerechnet, eventuelle Cent-Rundungen sind
              normal.
            </p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
