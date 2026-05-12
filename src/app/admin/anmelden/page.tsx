import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { adminLoginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminAnmeldenPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  if (await isAdmin()) redirect("/admin/spiele");
  const { fehler } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-forest-800/60 hover:text-forest-800">
          ← Zurück
        </Link>
        <div className="card p-8 mt-3">
          <h1 className="h-display text-3xl mb-1">Admin-Anmeldung</h1>
          <p className="text-sm text-forest-800/70 mb-6">
            Nur für den Veranstalter.
          </p>

          {fehler && (
            <div className="mb-4 rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
              {fehler}
            </div>
          )}

          <form action={adminLoginAction} className="grid gap-4">
            <div>
              <label className="label" htmlFor="pw">Passwort</label>
              <input
                id="pw"
                name="pw"
                type="password"
                className="input"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn-primary mt-2">
              Anmelden
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
