import { requireAdmin } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fehler?: string }>;
}) {
  await requireAdmin();
  const { ok, fehler } = await searchParams;

  return (
    <>
      <Nav admin />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="h-display text-4xl mb-1">Einstellungen</h1>
        <p className="text-sm text-forest-800/70 mb-6">
          Passphrase und Admin-Passwort ändern.
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

        <section className="card p-6 mb-6">
          <h2 className="font-display text-2xl mb-3">Geteilte Passphrase</h2>
          <p className="text-sm text-forest-800/70 mb-4">
            Wird zum Anlegen neuer Konten benötigt. Bestehende Mitglieder sind
            nicht betroffen, wenn du sie änderst.
          </p>
          <form action="/admin/einstellungen/do" method="POST" className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <input type="hidden" name="op" value="passphrase" />
            <div>
              <label className="label" htmlFor="newViewer">Neue Passphrase</label>
              <input id="newViewer" name="newViewer" type="text" className="input" required minLength={6} />
            </div>
            <button type="submit" className="btn-primary">Aktualisieren</button>
          </form>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-2xl mb-3">Admin-Passwort</h2>
          <form action="/admin/einstellungen/do" method="POST" className="grid gap-3">
            <input type="hidden" name="op" value="admin" />
            <div>
              <label className="label" htmlFor="currentAdmin">Aktuelles Passwort</label>
              <input id="currentAdmin" name="currentAdmin" type="password" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="newAdmin">Neues Passwort</label>
              <input id="newAdmin" name="newAdmin" type="password" className="input" required minLength={8} />
            </div>
            <div>
              <button type="submit" className="btn-primary">Passwort ändern</button>
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}
