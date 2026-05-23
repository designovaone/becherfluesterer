import { redirect } from "next/navigation";
import { db, settings } from "@/db";
import { count } from "drizzle-orm";
import { setupAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EinrichtenPage() {
  const rows = await db.select({ c: count() }).from(settings);
  if ((rows[0]?.c ?? 0) > 0) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12">
      <div className="card p-8 w-full max-w-md">
        <h1 className="h-display text-3xl mb-1">Erst-Einrichtung</h1>
        <p className="text-sm text-forest-800/70 mb-6">
          Bitte ein Admin-Passwort und die geteilte Passphrase für die Gruppe
          festlegen. Diese Seite ist danach nicht mehr erreichbar.
        </p>

        <form action={setupAction} className="grid gap-4">
          <div>
            <label className="label" htmlFor="admin">Admin-Passwort</label>
            <input id="admin" name="admin" type="password" className="input" required minLength={8} />
          </div>
          <div>
            <label className="label" htmlFor="viewer">Geteilte Passphrase</label>
            <input id="viewer" name="viewer" type="text" className="input" required minLength={6} />
            <p className="text-xs text-forest-800/60 mt-1.5">
              Diese teilst du einmal mit deinen Mitspielern. Damit können sie
              sich ein eigenes Konto anlegen; danach brauchen sie die
              Passphrase nicht mehr.
            </p>
          </div>
          <button type="submit" className="btn-primary mt-2">
            Einrichten und fortfahren
          </button>
        </form>
      </div>
    </main>
  );
}
