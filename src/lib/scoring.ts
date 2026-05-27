/**
 * Wett-Auswertung pro Spiel.
 *
 * Regel:
 *   1. Wer das Ergebnis exakt tippt, gewinnt. Mehrere exakte Tipps teilen.
 *   2. Andernfalls gewinnt der Tipp mit der kleinsten Differenz
 *      |pH-aH| + |pA-aA|. Gleichstand: aufteilen.
 *
 * Topf pro Spiel: 2 € × Anzahl Tippende.
 * Davon behält der Admin die Hälfte, die andere Hälfte wird gleichmäßig
 * unter den Gewinner(n) aufgeteilt.
 *
 * Der Einsatz (`stake`) ist parametrisiert: `payoutPerWinner` nutzt
 * standardmäßig `STAKE_EUR` (2 € pro Spiel), kann aber mit `CHAMPION_STAKE_EUR`
 * (5 € für den Weltmeister-Tipp) aufgerufen werden.
 */

export type BetLite = {
  userId: number;
  predHome: number;
  predAway: number;
};

/** Gibt die userIds der Gewinner zurück (kann mehrere sein). */
export function winnersOfMatch(
  bets: BetLite[],
  actualHome: number,
  actualAway: number,
): number[] {
  if (bets.length === 0) return [];

  const exact = bets.filter(
    (b) => b.predHome === actualHome && b.predAway === actualAway,
  );
  if (exact.length > 0) return exact.map((b) => b.userId);

  const withDiff = bets.map((b) => ({
    userId: b.userId,
    diff:
      Math.abs(b.predHome - actualHome) + Math.abs(b.predAway - actualAway),
  }));
  const min = withDiff.reduce((m, x) => (x.diff < m ? x.diff : m), Infinity);
  return withDiff.filter((x) => x.diff === min).map((x) => x.userId);
}

export const STAKE_EUR = 2;
export const CHAMPION_STAKE_EUR = 5;

/** Gewinn pro Person (gewinnender Topf-Anteil). */
export function payoutPerWinner(
  numBettors: number,
  numWinners: number,
  stake: number = STAKE_EUR,
): number {
  if (numWinners <= 0) return 0;
  const pot = stake * numBettors;
  const distributable = pot / 2;
  return distributable / numWinners;
}
