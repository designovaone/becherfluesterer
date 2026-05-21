import { asc, count } from "drizzle-orm";
import { db, users, bets } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminNutzerPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  await requireAdmin();
  const { fehler } = await searchParams;

  const list = await db
    .select({
      id: users.id,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name));

  // Count bets per user (small table → one query)
  const betCounts = await db
    .select({ userId: bets.userId, c: count() })
    .from(bets)
    .groupBy(bets.userId);
  const countByUser = new Map<number, number>(
    betCounts.map((r) => [r.userId, Number(r.c)]),
  );

  return (
    <>
      <Nav admin />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="h-display text-4xl mb-1">Mitglieder</h1>
        <p className="text-sm text-forest-800/70 mb-6">
          Konten werden bei der ersten Anmeldung automatisch erstellt.
        </p>

        {fehler && (
          <div className="mb-4 rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
            {fehler}
          </div>
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
                  <td className="px-3 sm:px-4 py-3 font-medium">{u.name}</td>
                  <td className="hidden sm:table-cell px-3 sm:px-4 py-3 text-forest-800/70 whitespace-nowrap">
                    {formatDateTime(u.createdAt)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-right tabular-nums">
                    {countByUser.get(u.id) ?? 0}
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right">
                    <form action="/admin/nutzer/do" method="POST">
                      <input type="hidden" name="op" value="delete" />
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        className="text-xs text-wine hover:underline"
                      >
                        Löschen
                      </button>
                    </form>
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
