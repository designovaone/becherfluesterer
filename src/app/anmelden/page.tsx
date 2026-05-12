import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewerSession } from "@/lib/auth";
import { anmeldenAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AnmeldenPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  if (await getViewerSession()) redirect("/spiele");
  const { fehler } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-forest-800/60 hover:text-forest-800">
          ← Zurück
        </Link>
        <div className="card p-8 mt-3">
          <h1 className="h-display text-3xl mb-1">Eintreten</h1>
          <p className="text-sm text-forest-800/70 mb-6">
            Gib die geteilte Passphrase und deinen Anzeigenamen ein.
            Bei neuem Namen wird dein Konto automatisch angelegt.
          </p>

          {fehler && (
            <div className="mb-4 rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
              {fehler}
            </div>
          )}

          <form action={anmeldenAction} className="grid gap-4">
            <div>
              <label className="label" htmlFor="passphrase">Passphrase</label>
              <input
                id="passphrase"
                name="passphrase"
                type="password"
                className="input"
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label" htmlFor="name">Dein Name</label>
              <input
                id="name"
                name="name"
                type="text"
                className="input"
                required
                minLength={2}
                maxLength={40}
                placeholder="z. B. Klaus"
              />
            </div>
            <button type="submit" className="btn-primary mt-2">
              Eintreten
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
