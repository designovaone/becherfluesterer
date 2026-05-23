import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewerUser, hasGateCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FEHLER_KOPIE: Record<string, string> = {
  passphrase: "Passphrase falsch.",
  duplicate:
    "Es gibt schon ein Konto mit diesem Vor- und Nachnamen. Melde dich rechts an oder wähle einen anderen Namen.",
  credentials: "Name oder Passwort falsch.",
  mismatch: "Die beiden Passwörter stimmen nicht überein.",
  validation:
    "Bitte alle Felder ausfüllen (Passwort min. 8 Zeichen, Namen 1–60 Zeichen).",
};

export default async function AnmeldenPage({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string }>;
}) {
  if (await getViewerUser()) redirect("/spiele");
  const { fehler } = await searchParams;
  const passed = await hasGateCookie();
  const fehlerText = fehler ? FEHLER_KOPIE[fehler] ?? fehler : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-forest-800/60 hover:text-forest-800">
          ← Zurück
        </Link>

        {!passed ? (
          <div className="card p-8 mt-3">
            <h1 className="h-display text-3xl mb-1">Eintreten</h1>
            <p className="text-sm text-forest-800/70 mb-6">
              Gib die geteilte Passphrase ein, die du vom Admin bekommen hast.
              Danach kannst du dir ein eigenes Konto anlegen oder dich mit
              deinem bestehenden Konto anmelden.
            </p>

            {fehlerText && (
              <div className="mb-4 rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
                {fehlerText}
              </div>
            )}

            <form action="/anmelden/do" method="POST" className="grid gap-4">
              <input type="hidden" name="op" value="gate" />
              <div>
                <label className="label" htmlFor="passphrase">
                  Passphrase
                </label>
                <input
                  id="passphrase"
                  name="passphrase"
                  type="password"
                  className="input"
                  required
                  autoComplete="off"
                />
              </div>
              <button type="submit" className="btn-primary mt-2">
                Weiter
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-3 grid gap-6">
            {fehlerText && (
              <div className="rounded-lg border border-wine/30 bg-wine/10 px-4 py-2.5 text-sm text-wine">
                {fehlerText}
              </div>
            )}

            {/* LOGIN — most common case, shown first */}
            <div className="card p-8">
              <h1 className="h-display text-3xl mb-1">Anmelden</h1>
              <p className="text-sm text-forest-800/70 mb-6">
                Schon dabei? Melde dich mit Vorname, Nachname und Passwort an.
              </p>
              <form action="/anmelden/do" method="POST" className="grid gap-4">
                <input type="hidden" name="op" value="login" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="login-firstName">
                      Vorname
                    </label>
                    <input
                      id="login-firstName"
                      name="firstName"
                      type="text"
                      className="input"
                      required
                      maxLength={60}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="login-lastName">
                      Nachname
                    </label>
                    <input
                      id="login-lastName"
                      name="lastName"
                      type="text"
                      className="input"
                      required
                      maxLength={60}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="login-password">
                    Passwort
                  </label>
                  <input
                    id="login-password"
                    name="password"
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

            {/* SIGNUP — for new members */}
            <div className="card p-8">
              <h2 className="h-display text-2xl mb-1">Neues Konto anlegen</h2>
              <p className="text-sm text-forest-800/70 mb-6">
                Neu hier? Lege dir ein Konto mit Vorname, Nachname und einem
                eigenen Passwort an.
              </p>
              <form action="/anmelden/do" method="POST" className="grid gap-4">
                <input type="hidden" name="op" value="signup" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="signup-firstName">
                      Vorname
                    </label>
                    <input
                      id="signup-firstName"
                      name="firstName"
                      type="text"
                      className="input"
                      required
                      maxLength={60}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="signup-lastName">
                      Nachname
                    </label>
                    <input
                      id="signup-lastName"
                      name="lastName"
                      type="text"
                      className="input"
                      required
                      maxLength={60}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="signup-password">
                    Passwort (min. 8 Zeichen)
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    className="input"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="signup-passwordRepeat">
                    Passwort wiederholen
                  </label>
                  <input
                    id="signup-passwordRepeat"
                    name="passwordRepeat"
                    type="password"
                    className="input"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="btn-primary mt-2">
                  Konto anlegen
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
