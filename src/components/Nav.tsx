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
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2 sm:py-0 sm:h-14 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span aria-hidden className="text-amber_-500 text-xl">❦</span>
          <span className="h-display text-lg">
            <span className="sm:hidden">Becher</span>
            <span className="hidden sm:inline">Becherflüsterer</span>
          </span>
        </Link>
        <nav className="flex items-center flex-wrap justify-end gap-x-0.5 sm:gap-x-1 gap-y-1 text-sm">
          {!admin && (
            <>
              <Link href="/spiele" className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200">Spiele</Link>
              <Link href="/rangliste" className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200">Rangliste</Link>
              <Link href="/weltmeister" className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200">
                <span className="sm:hidden">WM</span>
                <span className="hidden sm:inline">Weltmeister</span>
              </Link>
            </>
          )}
          {admin && (
            <>
              <Link href="/admin/spiele" className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200">Spiele</Link>
              <Link href="/admin/nutzer" className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200">Mitglieder</Link>
              <Link href="/rangliste" className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200">Rangliste</Link>
              <Link href="/admin/weltmeister" className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200">
                <span className="sm:hidden">WM</span>
                <span className="hidden sm:inline">Weltmeister</span>
              </Link>
              <Link href="/admin/einstellungen" className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200">
                <span className="sm:hidden">Einst.</span>
                <span className="hidden sm:inline">Einstellungen</span>
              </Link>
            </>
          )}
          {name && (
            <span className="inline-flex ml-2 chip max-w-[12rem] truncate" title="Angemeldet als">
              {admin ? "Admin" : name}
            </span>
          )}
          {(name || admin) && (
            <form action="/abmelden" method="POST" className="ml-0.5 sm:ml-1">
              <button
                type="submit"
                className="px-2 sm:px-3 py-1.5 rounded hover:bg-parchment-200 text-forest-800/70"
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
