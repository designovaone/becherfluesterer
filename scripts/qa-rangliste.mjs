/* ============================================================================
 * ⚠️  DESTRUCTIVE — WIPES ALL DATA IN users / matches / bets BEFORE SEEDING ⚠️
 * ============================================================================
 *
 * This script DELETES every row from the `bets`, `users`, and `matches` tables
 * in the database pointed to by DATABASE_URL, then reseeds with 15 dummy users
 * and 6 controlled matches for QA purposes.
 *
 * NEVER run this against a production database with real Mitspieler-Tipps.
 * Verify your DATABASE_URL points to the right environment before running.
 *
 * The `settings` table (admin password, viewer passphrase) is NOT touched.
 *
 * ----------------------------------------------------------------------------
 * QA script for the Rangliste algorithm.
 *
 * Seeds cover the key scoring scenarios:
 *   - G1: solo exact winner
 *   - G2: two-way exact tie (split)
 *   - G3: solo smallest-L1 winner (no exact)
 *   - G4: not finalized — bets count, but no payout yet
 *   - G5: betting_open = false — bets must NOT count
 *   - G6: solo smallest-L1 winner (no exact)
 *
 * Then computes the leaderboard the same way the page does and compares
 * against a hand-computed expected table.
 *
 * Run (from project root):
 *   set -a; source .env.local; set +a; node scripts/qa-rangliste.mjs
 * ============================================================================ */

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Source .env.local first.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// scrypt hash of "test" — for QA fixtures only. Inlined as a literal because
// src/lib/auth.ts starts with `import "server-only"` and would throw if we
// tried to import its hashPassword from this plain Node script.
const TEST_PASSWORD_HASH =
  "scrypt$PxZaBDJ-AYaFYaaCMLFOGw$2TMKlxKhV42XlRfgHIFLy2wNKBXiTItcdhk3L7uKUenfy6Erac0MH3ctaxqQz1Xt9L_EAoBEAzYKwq8d5RJ5Yw";

// Mirror of normalizeName() in src/lib/auth.ts. Inlined for the same reason.
function normalizeName(s) {
  return s.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

const STAKE_EUR = 2;

// All fixtures share last_name = "Test"; the unique index spans
// (first_name_key, last_name_key) so distinct first names keep them unique.
const FIXTURE_LAST_NAME = "Test";

const userNames = [
  "Andreas", "Brigitte", "Christian", "Doris", "Emma",
  "Friedrich", "Gerda", "Hans", "Ines", "Jürgen",
  "Klara", "Lukas", "Maria", "Norbert", "Oskar",
];

function daysAgo(n) { return new Date(Date.now() - n * 86_400_000); }
function daysFromNow(n) { return new Date(Date.now() + n * 86_400_000); }

const matchSpecs = [
  { code: "G1", home: "Deutschland", away: "USA",         stage: "Gruppenphase",  kickoff: daysAgo(7), hs: 2,    as: 1,    finalized: true,  open: true  },
  { code: "G2", home: "Brasilien",   away: "Argentinien", stage: "Gruppenphase",  kickoff: daysAgo(6), hs: 0,    as: 0,    finalized: true,  open: true  },
  { code: "G3", home: "Frankreich",  away: "Italien",     stage: "Viertelfinale", kickoff: daysAgo(5), hs: 3,    as: 2,    finalized: true,  open: true  },
  { code: "G4", home: "Mexiko",      away: "Kanada",      stage: "Gruppenphase",  kickoff: daysFromNow(1), hs: null, as: null, finalized: false, open: true  },
  { code: "G5", home: "Spanien",     away: "Portugal",    stage: "Gruppenphase",  kickoff: daysAgo(4), hs: 4,    as: 1,    finalized: true,  open: false },
  { code: "G6", home: "England",     away: "Wales",       stage: "Gruppenphase",  kickoff: daysAgo(3), hs: 1,    as: 1,    finalized: true,  open: true  },
];

// Each row: [predHome, predAway] for that user on that match
const bets = {
  G1: { Andreas:[2,1], Brigitte:[1,0], Christian:[3,0], Doris:[0,0], Emma:[1,1], Friedrich:[4,0], Gerda:[2,0], Hans:[3,1], Ines:[0,2], Jürgen:[2,3], Klara:[1,3], Lukas:[0,1], Maria:[3,3], Norbert:[4,1], Oskar:[4,2] },
  G2: { Andreas:[1,0], Brigitte:[0,0], Christian:[0,0], Doris:[2,1], Emma:[1,1], Friedrich:[3,0], Gerda:[2,2], Hans:[1,2], Ines:[0,3], Jürgen:[3,1], Klara:[2,3], Lukas:[1,3], Maria:[4,0], Norbert:[3,3], Oskar:[0,4] },
  G3: { Andreas:[1,0], Brigitte:[2,1], Christian:[0,0], Doris:[1,1], Emma:[3,1], Friedrich:[4,1], Gerda:[0,2], Hans:[5,0], Ines:[1,3], Jürgen:[4,4], Klara:[0,1], Lukas:[5,5], Maria:[1,4], Norbert:[0,3], Oskar:[4,3] },
  G4: { Andreas:[1,0], Brigitte:[2,0], Christian:[1,1], Doris:[0,0], Emma:[3,1], Friedrich:[2,1], Gerda:[0,1], Hans:[1,2], Ines:[2,2], Jürgen:[3,0], Klara:[0,2], Lukas:[1,3], Maria:[2,3], Norbert:[0,3], Oskar:[4,0] },
  G5: { Andreas:[4,1], Brigitte:[3,2], Christian:[2,1], Doris:[5,0], Emma:[4,0], Friedrich:[4,2], Gerda:[3,1], Hans:[2,0], Ines:[5,1], Jürgen:[3,0], Klara:[4,3], Lukas:[6,1], Maria:[1,0], Norbert:[2,2], Oskar:[3,3] },
  G6: { Andreas:[0,0], Brigitte:[2,2], Christian:[3,0], Doris:[0,2], Emma:[3,1], Friedrich:[0,3], Gerda:[2,1], Hans:[4,4], Ines:[3,3], Jürgen:[5,0], Klara:[0,5], Lukas:[4,0], Maria:[2,3], Norbert:[3,2], Oskar:[0,4] },
};

// Hand-computed expected ranking (one row per user). Names are the full
// display name "{first} Test" because the page renders first + last.
const expected = [
  { name: "Andreas Test",   bets: 5, wins: 1, winnings: 15.00 }, // G1 exact solo
  { name: "Emma Test",      bets: 5, wins: 1, winnings: 15.00 }, // G3 L1=1 solo
  { name: "Gerda Test",     bets: 5, wins: 1, winnings: 15.00 }, // G6 L1=1 solo
  { name: "Brigitte Test",  bets: 5, wins: 1, winnings:  7.50 }, // G2 exact tie (1/2)
  { name: "Christian Test", bets: 5, wins: 1, winnings:  7.50 }, // G2 exact tie (1/2)
  { name: "Doris Test",     bets: 5, wins: 0, winnings:  0.00 },
  { name: "Friedrich Test", bets: 5, wins: 0, winnings:  0.00 },
  { name: "Hans Test",      bets: 5, wins: 0, winnings:  0.00 },
  { name: "Ines Test",      bets: 5, wins: 0, winnings:  0.00 },
  { name: "Jürgen Test",    bets: 5, wins: 0, winnings:  0.00 },
  { name: "Klara Test",     bets: 5, wins: 0, winnings:  0.00 },
  { name: "Lukas Test",     bets: 5, wins: 0, winnings:  0.00 },
  { name: "Maria Test",     bets: 5, wins: 0, winnings:  0.00 },
  { name: "Norbert Test",   bets: 5, wins: 0, winnings:  0.00 },
  { name: "Oskar Test",     bets: 5, wins: 0, winnings:  0.00 },
];

// ---- Mirror of src/lib/scoring.ts ----
function winnersOfMatch(matchBets, hs, as) {
  if (matchBets.length === 0) return [];
  const exact = matchBets.filter(b => b.predHome === hs && b.predAway === as);
  if (exact.length > 0) return exact.map(b => b.userId);
  const withDiff = matchBets.map(b => ({
    userId: b.userId,
    diff: Math.abs(b.predHome - hs) + Math.abs(b.predAway - as),
  }));
  const min = withDiff.reduce((m, x) => x.diff < m ? x.diff : m, Infinity);
  return withDiff.filter(x => x.diff === min).map(x => x.userId);
}

function payoutPerWinner(numBettors, numWinners) {
  if (numWinners <= 0) return 0;
  return (STAKE_EUR * numBettors / 2) / numWinners;
}

// ---- Seed ----
async function seed() {
  console.log("Wiping bets, users, matches…");
  await sql`DELETE FROM bets`;
  await sql`DELETE FROM users`;
  await sql`DELETE FROM matches`;

  const userByName = new Map();
  for (const firstName of userNames) {
    const fnKey = normalizeName(firstName);
    const lnKey = normalizeName(FIXTURE_LAST_NAME);
    const [u] = await sql`
      INSERT INTO users (first_name, last_name, first_name_key, last_name_key, password_hash)
      VALUES (${firstName}, ${FIXTURE_LAST_NAME}, ${fnKey}, ${lnKey}, ${TEST_PASSWORD_HASH})
      RETURNING id, first_name AS "firstName", last_name AS "lastName"
    `;
    userByName.set(firstName, u);
  }
  console.log(`Inserted ${userByName.size} users.`);

  const matchByCode = new Map();
  for (const m of matchSpecs) {
    const [row] = await sql`
      INSERT INTO matches (home_team, away_team, kickoff_at, stage, home_score, away_score, finalized, betting_open)
      VALUES (${m.home}, ${m.away}, ${m.kickoff.toISOString()}, ${m.stage}, ${m.hs}, ${m.as}, ${m.finalized}, ${m.open})
      RETURNING id, home_team, away_team, kickoff_at, stage, home_score, away_score, finalized, betting_open
    `;
    matchByCode.set(m.code, row);
  }
  console.log(`Inserted ${matchByCode.size} matches.`);

  let betCount = 0;
  for (const code of Object.keys(bets)) {
    const m = matchByCode.get(code);
    for (const name of Object.keys(bets[code])) {
      const u = userByName.get(name);
      const [ph, pa] = bets[code][name];
      await sql`
        INSERT INTO bets (user_id, match_id, pred_home, pred_away)
        VALUES (${u.id}, ${m.id}, ${ph}, ${pa})
      `;
      betCount++;
    }
  }
  console.log(`Inserted ${betCount} bets.`);
}

// ---- Mirror of /rangliste page logic ----
async function computeRanglisteFromDb() {
  const allUsers = await sql`SELECT id, first_name AS "firstName", last_name AS "lastName" FROM users`;
  const allMatches = await sql`SELECT * FROM matches ORDER BY id ASC`;
  const rawBets = await sql`SELECT * FROM bets`;

  const openMatchIds = new Set(
    allMatches.filter(m => m.betting_open).map(m => m.id)
  );
  const allBets = rawBets.filter(b => openMatchIds.has(b.match_id));

  const byMatch = new Map();
  for (const b of allBets) {
    if (!byMatch.has(b.match_id)) byMatch.set(b.match_id, []);
    byMatch.get(b.match_id).push({
      userId: b.user_id,
      predHome: b.pred_home,
      predAway: b.pred_away,
    });
  }

  const stats = new Map();
  for (const u of allUsers) {
    stats.set(u.id, {
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`,
      bets: 0,
      wins: 0,
      winnings: 0,
    });
  }
  for (const b of allBets) {
    const row = stats.get(b.user_id);
    if (row) row.bets += 1;
  }
  for (const m of allMatches) {
    if (!m.betting_open || !m.finalized || m.home_score === null || m.away_score === null) continue;
    const ms = byMatch.get(m.id) ?? [];
    if (ms.length === 0) continue;
    const winners = winnersOfMatch(ms, m.home_score, m.away_score);
    if (winners.length === 0) continue;
    const payout = payoutPerWinner(ms.length, winners.length);
    for (const id of winners) {
      const row = stats.get(id);
      if (!row) continue;
      row.wins += 1;
      row.winnings += payout;
    }
  }

  const rows = [...stats.values()].sort((a, b) =>
    b.winnings - a.winnings ||
    b.wins - a.wins ||
    b.bets - a.bets ||
    a.name.localeCompare(b.name, "de")
  );

  const totalPot = STAKE_EUR * allBets.length;
  return { rows, totalPot, allMatches, byMatch };
}

// ---- Run ----
function fmtEUR(n) { return `€${n.toFixed(2)}`; }
function pad(s, n) { return String(s).padEnd(n); }
function rpad(s, n) { return String(s).padStart(n); }

async function main() {
  await seed();

  const { rows, totalPot, allMatches, byMatch } = await computeRanglisteFromDb();

  console.log("\n=== Rangliste (computed from DB with the page's algorithm) ===");
  console.log(`Total Pot: ${fmtEUR(totalPot)} · Party-Kasse (50%): ${fmtEUR(totalPot/2)}`);
  console.log(`# | ${pad("Name",18)} | Tipps | Gewonnen | Gewinn`);
  rows.forEach((r, i) => {
    console.log(`${rpad(i+1,2)}| ${pad(r.name,18)} | ${rpad(r.bets,5)} | ${rpad(r.wins,8)} | ${fmtEUR(r.winnings)}`);
  });

  console.log("\n=== Row-by-row comparison vs hand-computed expected ===");
  let mismatches = 0;
  for (let i = 0; i < expected.length; i++) {
    const a = rows[i];
    const e = expected[i];
    const ok =
      a && a.name === e.name &&
      a.bets === e.bets &&
      a.wins === e.wins &&
      Math.abs(a.winnings - e.winnings) < 0.005;
    const tag = ok ? "✓" : "✗";
    if (!ok) mismatches++;
    const aStr = a ? `${a.name} ${a.bets}/${a.wins}/${fmtEUR(a.winnings)}` : "<missing>";
    const eStr = `${e.name} ${e.bets}/${e.wins}/${fmtEUR(e.winnings)}`;
    console.log(`${tag} Rank ${rpad(i+1,2)}  expected: ${pad(eStr,40)}  got: ${aStr}`);
  }

  console.log("\n=== Per-match invariants ===");
  for (const m of allMatches) {
    const ms = byMatch.get(m.id) ?? [];
    const pot = STAKE_EUR * ms.length;
    const half = pot / 2;
    let line = `${m.home_team} – ${m.away_team}`;
    if (!m.betting_open) {
      console.log(`✓ ${line}: betting_open=false → ${ms.length} bets counted (expected 0)`);
      if (ms.length !== 0) mismatches++;
      continue;
    }
    if (!m.finalized || m.home_score === null) {
      console.log(`✓ ${line}: open, NOT finalized → ${ms.length} bets count toward Tipps, no payout yet`);
      continue;
    }
    const winners = winnersOfMatch(ms, m.home_score, m.away_score);
    const distributed = winners.length > 0 ? half : 0;
    console.log(
      `✓ ${line} ${m.home_score}:${m.away_score} · ${ms.length} bets · ` +
      `pot ${fmtEUR(pot)} · half ${fmtEUR(half)} · ` +
      `${winners.length} winner(s) · distributed ${fmtEUR(distributed)} ` +
      `(${winners.length > 0 ? fmtEUR(distributed/winners.length) + " each" : "—"})`
    );
  }

  console.log("\n=== Aggregate invariants ===");
  const expectedTotalPot = STAKE_EUR * 5 * 15; // 5 open matches × 15 bettors
  const okPot = totalPot === expectedTotalPot;
  console.log(`${okPot ? "✓" : "✗"} totalPot: expected ${fmtEUR(expectedTotalPot)}, got ${fmtEUR(totalPot)}`);
  if (!okPot) mismatches++;

  const totalDistributed = rows.reduce((s, r) => s + r.winnings, 0);
  // G1 €15 + G2 €15 + G3 €15 + G6 €15 = €60. G4 not finalized; G5 closed.
  const expectedDistributed = 60;
  const okDist = Math.abs(totalDistributed - expectedDistributed) < 0.01;
  console.log(`${okDist ? "✓" : "✗"} total distributed winnings: expected ${fmtEUR(expectedDistributed)}, got ${fmtEUR(totalDistributed)}`);
  if (!okDist) mismatches++;

  const totalWins = rows.reduce((s, r) => s + r.wins, 0);
  // 1(G1) + 2(G2) + 1(G3) + 1(G6) = 5 winner-rows
  const expectedWins = 5;
  const okWins = totalWins === expectedWins;
  console.log(`${okWins ? "✓" : "✗"} total winner-rows: expected ${expectedWins}, got ${totalWins}`);
  if (!okWins) mismatches++;

  console.log("\n=== QA RESULT ===");
  console.log(mismatches === 0 ? "✓ PASS — all rows and invariants match expected" : `✗ FAIL — ${mismatches} mismatch(es)`);
  process.exit(mismatches === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
