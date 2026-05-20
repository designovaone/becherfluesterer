import Link from "next/link";

export function Nav({
  name,
  admin = false,
}: {
  name?: string;
  admin?: boolean;
}) {
  return (
    <header className="border-b border-forest-800/15 bg-parchment-50/70 backdrop-blur sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="text-amber_-500 text-xl">❦</span>
          <span className="h-display text-lg">Becherflüsterer</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {!admin && (
            <>
              <Link href="/spiele" className="px-3 py-1.5 rounded hover:bg-parchment-200">Spiele</Link>
              <Link href="/rangliste" className="px-3 py-1.5 rounded hover:bg-parchment-200">Rangliste</Link>
            </>
          )}
          {admin && (
            <>
              <Link href="/admin/spiele" className="px-3 py-1.5 rounded hover:bg-parchment-200">Spiele</Link>
              <Link href="/admin/nutzer" className="px-3 py-1.5 rounded hover:bg-parchment-200">Mitglieder</Link>
              <Link href="/rangliste" className="px-3 py-1.5 rounded hover:bg-parchment-200">Rangliste</Link>
              <Link href="/admin/einstellungen" className="px-3 py-1.5 rounded hover:bg-parchment-200">Einstellungen</Link>
            </>
          )}
          {name && (
            <span className="ml-2 chip" title="Angemeldet als">
              {admin ? "Admin" : name}
            </span>
          )}
          {(name || admin) && (
            <form action="/abmelden" method="POST" className="ml-1">
              <button
                type="submit"
                className="px-3 py-1.5 rounded hover:bg-parchment-200 text-forest-800/70"
              >
                Abmelden
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
