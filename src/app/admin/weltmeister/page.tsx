import { eq } from "drizzle-orm";
import { db, championBets, settings, users } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatDateTime } from "@/lib/format";
import { WM2026_TEAMS } from "@/lib/teams";

export const dynamic = "force-dynamic";

// DUPLICATED from admin/spiele/page.tsx (per spec v2 Q2 — do not extract).
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

export default async function AdminWeltmeisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fehler?: string }>;
}) {
  await requireAdmin();
  const { ok, fehler } = await searchParams;

  const [cfg] = await db.select().from(settings).limit(1);
  const cutoff = cfg?.championCutoffAt ?? null;
  const winner = cfg?.championWinner ?? null;

  const picksRaw = await db
    .select({
      userId: championBets.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      team: championBets.team,
    })
    .from(championBets)
    .innerJoin(users, eq(championBets.userId, users.id));
  const picks = picksRaw
    .slice()
    .sort((a, b) => a.firstName.localeCompare(b.firstName, "de"));

  // If a winner was set and the team list was later edited so the stored value
  // is no longer in WM2026_TEAMS, surface it as an extra option — otherwise the
  // select would silently fall back to "— noch offen —" and a blind re-submit
  // would wipe a valid winner. (QA S-2.)
  const winnerOptions =
    winner && !WM2026_TEAMS.includes(winner)
      ? [winner, ...WM2026_TEAMS]
      : WM2026_TEAMS;

  return (
    <>
      <Nav admin />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="h-display text-4xl mb-1">Weltmeister-Tipp verwalten</h1>
        <p className="text-sm text-forest-800/70 mb-6">
          Wett-Schluss festlegen, Weltmeister eintragen, alle Tipps einsehen.
        </p>

        {ok && (
          <div className="mb-4 rounded-lg border border-forest-700/30 bg-forest-700/10 px-4 py-2.5 text-sm text-forest-800">
            {ok}
          </div>
        )}
        {fehler && (
          <div className="mb-4 rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
            {fehler}
          </div>
        )}

        {/* Wett-Schluss */}
        <section className="card p-6 mb-6">
          <h2 className="font-display text-2xl mb-3">Wett-Schluss</h2>
          <p className="text-sm text-forest-800/70 mb-4">
            Bis zu diesem Zeitpunkt können Mitglieder tippen und sehen nur ihren
            eigenen Tipp. Danach wird das Formular ausgeblendet und die volle
            Tipp-Tabelle für alle sichtbar.
            {cutoff && (
              <>
                {" "}Aktuell: <strong>{formatDateTime(cutoff)}</strong>.
              </>
            )}
          </p>
          <form
            action="/admin/weltmeister/do"
            method="POST"
            className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"
          >
            <input type="hidden" name="op" value="cutoff" />
            <div>
              <label className="label" htmlFor="kickoff">
                Wett-Schluss (Europa/Berlin)
              </label>
              <input
                id="kickoff"
                name="kickoff"
                type="datetime-local"
                className="input tabular-nums"
                defaultValue={cutoff ? toLocalInput(cutoff) : ""}
                required
              />
            </div>
            <button type="submit" className="btn-primary">
              Speichern
            </button>
          </form>
        </section>

        {/* Weltmeister festlegen */}
        <section className="card p-6 mb-6">
          <h2 className="font-display text-2xl mb-3">Weltmeister festlegen</h2>
          <p className="text-sm text-forest-800/70 mb-4">
            Sobald du hier ein Land wählst, werden die Gewinner gewertet und auf
            der Mitglieder-Seite hervorgehoben. „— noch offen —" setzt das wieder
            zurück.
          </p>
          <form
            action="/admin/weltmeister/do"
            method="POST"
            className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"
          >
            <input type="hidden" name="op" value="winner" />
            <div>
              <label className="label" htmlFor="winner">
                Weltmeister
              </label>
              <select
                id="winner"
                name="winner"
                className="input"
                defaultValue={winner ?? ""}
              >
                <option value="">— noch offen —</option>
                {winnerOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Speichern
            </button>
          </form>
        </section>

        {/* Alle Tipps */}
        <section className="card p-6">
          <h2 className="font-display text-2xl mb-3">Alle Tipps ({picks.length})</h2>
          {picks.length === 0 ? (
            <p className="text-sm text-forest-800/60">
              Noch keine Tipps abgegeben.
            </p>
          ) : (
            <ul className="grid gap-1.5">
              {picks.map((p) => {
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
                    </span>
                    <span className="font-semibold">{p.team}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
