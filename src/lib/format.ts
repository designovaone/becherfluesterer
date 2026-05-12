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
