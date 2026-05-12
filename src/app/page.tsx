import Link from "next/link";
import { db, settings } from "@/db";
import { count } from "drizzle-orm";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Setup-Status prüfen: leere settings → /einrichten
  const settingsCount = await db.select({ c: count() }).from(settings);
  if ((settingsCount[0]?.c ?? 0) === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="card p-8 max-w-md text-center">
          <h1 className="h-display text-3xl mb-2">Willkommen</h1>
          <p className="text-forest-800/80 mb-6">
            Diese Seite ist noch nicht eingerichtet. Bitte als Admin starten.
          </p>
          <Link href="/einrichten" className="btn-primary">
            Jetzt einrichten
          </Link>
        </div>
      </main>
    );
  }

  const turnier =
    process.env.NEXT_PUBLIC_TURNIER_NAME ?? "Fußball-Weltmeisterschaft 2026";

  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-parchment-100 via-parchment-50 to-parchment"
        />
        {/* Faint confetti */}
        <div
          aria-hidden
          className="absolute top-10 left-8 text-4xl opacity-15 -z-10 -rotate-12 select-none hidden sm:block"
        >
          🏆
        </div>
        <div
          aria-hidden
          className="absolute top-10 right-8 text-4xl opacity-15 -z-10 rotate-12 select-none hidden sm:block"
        >
          ⚽
        </div>
        <div
          aria-hidden
          className="absolute bottom-10 left-1/4 text-3xl opacity-10 -z-10 select-none hidden md:block"
        >
          🎉
        </div>
        <div
          aria-hidden
          className="absolute bottom-16 right-1/4 text-3xl opacity-10 -z-10 select-none hidden md:block"
        >
          ⚽
        </div>

        <div className="max-w-3xl mx-auto px-5 pt-14 pb-20 text-center">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-[0.22em] text-amber_-700 mb-4">
            <span aria-hidden className="text-base">⚽</span>
            <span className="h-px w-8 bg-amber_-500" />
            <span>Tippkreis · seit Anno Dazumal</span>
            <span className="h-px w-8 bg-amber_-500" />
            <span aria-hidden className="text-base">🏆</span>
          </div>

          {/* Title */}
          <h1 className="h-display text-[clamp(2.75rem,8vw,5.5rem)] text-forest-800">
            Becherflüsterer
          </h1>

          {/* Tagline */}
          <p className="mt-6 mx-auto max-w-xl text-lg text-forest-800/80">
            Unser privater Tippkreis zur {turnier}. Zwei Euro pro Spiel,
            der beste Tipp gewinnt — und am Ende feiern wir alle zusammen.
          </p>

          {/* Tournament chips */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <span className="chip bg-amber_-500/15 text-amber_-700">
              🇨🇦 🇲🇽 🇺🇸 Austragung 2026
            </span>
            <span className="chip">48 Teams</span>
            <span className="chip">104 Spiele</span>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/anmelden" className="btn-amber">
              Mit Passphrase eintreten →
            </Link>
            <Link href="/admin/anmelden" className="btn-secondary">
              Admin-Bereich
            </Link>
          </div>

          {/* Animated soccer / trophy row */}
          <div
            aria-hidden
            className="mt-12 flex justify-center items-end gap-6 text-5xl select-none"
          >
            <span className="inline-block animate-bounce">⚽</span>
            <span className="inline-block animate-pulse">🏆</span>
            <span className="inline-block animate-bounce [animation-delay:0.3s]">
              ⚽
            </span>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
