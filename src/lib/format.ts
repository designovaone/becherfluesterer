const dateFmt = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

const eurFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatDateTime(d: Date | string): string {
  return dateFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function formatEuro(n: number): string {
  return eurFmt.format(n);
}

/** Tipps werden so viele Minuten vor Anpfiff gesperrt. */
export const BET_LOCK_MINUTES_BEFORE_KICKOFF = 10;

export function isLocked(kickoff: Date | string): boolean {
  const t = typeof kickoff === "string" ? new Date(kickoff).getTime() : kickoff.getTime();
  return t - BET_LOCK_MINUTES_BEFORE_KICKOFF * 60_000 <= Date.now();
}

/**
 * Sind die Wetten für den Weltmeister-Tipp geschlossen?
 *
 * Schlägt bewusst Richtung OFFEN aus (Datenschutz): bei fehlendem/ungültigem
 * Cut-off geben wir `false` zurück, damit nie "geschlossen" gemeldet wird —
 * das würde sonst vorzeitig alle Tipps offenlegen.
 */
export function championBettingClosed(
  cutoff: Date | string | null | undefined,
): boolean {
  if (!cutoff) return false;
  const t = typeof cutoff === "string" ? new Date(cutoff).getTime() : cutoff.getTime();
  if (Number.isNaN(t)) return false;
  return t <= Date.now();
}
