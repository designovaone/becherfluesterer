import { asc, count } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, users, bets } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatDateTime } from "@/lib/format";
import { ConfirmButton } from "./ConfirmButton";
import { TempBanner } from "./TempBanner";

export const dynamic = "force-dynamic";

export default async function AdminNutzerPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; show?: string }>;
}) {
  await requireAdmin();
  const { fehler, show } = await searchParams;

  const list = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.lastName), asc(users.firstName));

  // Count bets per user (small table → one query)
  const betCounts = await db
    .select({ userId: bets.userId, c: count() })
    .from(bets)
    .groupBy(bets.userId);
  const countByUser = new Map<number, number>(
    betCounts.map((r) => [r.userId, Number(r.c)]),
  );

  // Read the one-shot temp-password cookie if the URL says to show it. We do
  // NOT call cookies().delete() here — Server Components in Next 15 can read
  // cookies but cannot modify them during render. The cookie's Max-Age=60s
  // handles cleanup naturally; if the admin reloads ?show=<id> within 60s,
  // the banner re-appears, which is acceptable because (a) it's HttpOnly so
  // no script can read it, and (b) the only "leak" is the admin re-seeing
  // their own freshly-generated value on their own browser.
  const showId = show ? Number(show) : null;
  let tempBannerName: string | null = null;
  let tempBannerValue: string | null = null;
  if (showId && Number.isInteger(showId) && showId > 0) {
    const c = await cookies();
    const tempCookie = c.get(`bf_temp_pw_${showId}`)?.value;
    if (tempCookie) {
      // If the user was deleted between reset and view, name is empty and the
      // banner falls back to "Mitglied". Documented trade-off; harmless.
      const u = list.find((row) => row.id === showId);
      tempBannerName = u ? `${u.firstName} ${u.lastName}` : "";
      tempBannerValue = tempCookie;
    }
  }

  return (
    <>
      <Nav admin />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="h-display text-4xl mb-1">Mitglieder</h1>
        <p className="text-sm text-forest-800/70 mb-6">
          Mitglieder registrieren sich selbst über{" "}
          <code className="px-1 rounded bg-parchment-200/70">/anmelden</code>.
          Hier kannst du Passwörter zurücksetzen oder Mitglieder löschen.
        </p>

        {fehler && (
          <div className="mb-4 rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
            {fehler}
          </div>
        )}

        {tempBannerValue !== null && (
          <TempBanner name={tempBannerName ?? ""} temp={tempBannerValue} />
        )}

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200/70">
              <tr className="text-left">
                <th className="px-3 sm:px-4 py-3">Name</th>
                <th className="hidden sm:table-cell px-3 sm:px-4 py-3">Beigetreten</th>
                <th className="px-2 sm:px-4 py-3 text-right">Tipps</th>
                <th className="px-3 sm:px-4 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 sm:px-4 py-8 text-center text-forest-800/60">
                    Noch keine Mitglieder.
                  </td>
                </tr>
              )}
              {list.map((u) => (
                <tr key={u.id} className="border-t border-forest-800/10">
                  <td className="px-3 sm:px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="hidden sm:table-cell px-3 sm:px-4 py-3 text-forest-800/70 whitespace-nowrap">
                    {formatDateTime(u.createdAt)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-right tabular-nums">
                    {countByUser.get(u.id) ?? 0}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3 flex-wrap">
                      <form action="/admin/nutzer/do" method="POST">
                        <input type="hidden" name="op" value="reset" />
                        <input type="hidden" name="id" value={u.id} />
                        <ConfirmButton
                          type="submit"
                          message={`Passwort für ${u.firstName} ${u.lastName} zurücksetzen? Alle bestehenden Sitzungen werden sofort ungültig.`}
                          className="text-xs text-forest-800/80 hover:underline"
                        >
                          Passwort zurücksetzen
                        </ConfirmButton>
                      </form>
                      <form action="/admin/nutzer/do" method="POST">
                        <input type="hidden" name="op" value="delete" />
                        <input type="hidden" name="id" value={u.id} />
                        <ConfirmButton
                          type="submit"
                          message={`Mitglied ${u.firstName} ${u.lastName} löschen? Alle Tipps dieses Mitglieds werden mit entfernt.`}
                          className="text-xs text-wine hover:underline"
                        >
                          Löschen
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-forest-800/60">
          Beim Löschen werden auch alle Tipps dieses Mitglieds entfernt.
        </p>
      </main>
      <Footer />
    </>
  );
}
