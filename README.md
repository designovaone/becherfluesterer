# Becherflüsterer

> A small, private football betting pool for a close group of friends. €2 per tip, the best tip per match wins, half the pot pays for the closing party. No accounts, no jackpots, no real-money handling. Just a paper pool that runs in a browser.

Becherflüsterer is built for a single tournament (the FIFA World Cup 2026 in the first version, but adaptable). A group of friends share a single *gate passphrase* once to sign up; each member then has their own account (first name + last name + password) and tips on whichever matches the admin has opened for betting. Scoring is dead simple. The whole thing is meant to disappear into the background of game day, not be a hobby in itself.

If you are looking for an OddsCalculator-style platform with brackets, props, jackpots, automated scoring, and per-user logins, this is the wrong project. It is a *Stammtisch*-style Tippkreis with as little overhead as possible.

## How members experience it

1. Open the website. See the title, the tagline, two buttons.
2. Click **"Mitspieler →"**.
3. **First time:** type the shared *gate passphrase* the admin sent you. Then create your account with first name, last name, and a password you pick. You're in.
4. **Next time:** the gate passphrase isn't asked again on the same browser — just log in with your name and password. (Sessions last about a year and refresh on every visit.)
5. On **Spiele**, see every match the admin has opened. Enter a Tipp. Edit it whenever you want — up to 10 minutes before *Anpfiff*.
6. After kickoff, the page shows everyone's tip publicly. After the match is finalized, winners are highlighted and the pot per match is shown.
7. The **Rangliste** is the running scoreboard, sorted by winnings in €, then by wins, then by tips placed.

That's it. No notifications, no app to install, no dashboard. Works in any phone browser.

**Forgot your password?** Message the admin. They reset it from `/admin/nutzer` and send you a one-time temp password (something like `mond-kreuz-elf-baum-72`) via WhatsApp. That temp becomes your new permanent password until you ask for another reset.

## How the admin experiences it

**One-time setup.** On the very first visit, `/einrichten` asks you to set two things: an admin password (just for you) and the shared viewer passphrase (for everyone else). Both are hashed and stored. The setup page locks itself afterwards.

**Before the tournament.** Add the matches one by one — two teams, stage, kickoff in local time. You can also import a match list later via SQL if you prefer.

**During the tournament.** Per matchday, roughly five minutes of work:
- Open betting on the games the group wants to tip on. Games involving Germany auto-open; everything else stays closed unless you flip the chip.
- After each match ends, enter the 90-minute result and tick **Endgültig**. The Rangliste recalculates instantly.
- That's the whole loop.

**See who tipped what.** Each match card on `/admin/spiele` shows every member's prediction inline, with winners highlighted once you finalize the score. No separate report to run.

**A member forgot their password.** Open `/admin/nutzer`, click **"Passwort zurücksetzen"** next to their name, confirm. A one-time temp password appears in a banner with a copy button. Send it via WhatsApp. The member logs in with that temp; it becomes their new permanent password. The reset also invalidates any other devices that member was logged in on.

**Forgot your admin password?** Set `ADMIN_PASSWORD` in the environment — that value is always accepted as a recovery login, regardless of what's stored in the database. Useful for an admin who logs in once a week and predictably forgets.

## The rules of the pool

| | |
|---|---|
| **Einsatz** | 2 € per tip per match |
| **Topf pro Spiel** | 2 € × number of people who tipped on that match |
| **Pot split** | 50 % goes to the admin for the *Abschlussparty*. 50 % is paid out to the match winner(s). |
| **Scoring** | Exact tip wins. If no one tipped exactly, smallest goal-difference \|ΔHeim\|+\|ΔAuswärts\| wins. Multiple winners split the prize evenly. |
| **Knockout matches** | Only the **90-minute** result counts. Extra time and penalty shootouts are ignored for scoring purposes. |
| **Tip lockout** | 10 minutes before *Anpfiff*. After that, no changes. |
| **Money handling** | None. Everything settles in person at the closing party. The app just tracks what's owed. |

### Der Weltmeister-Tipp

A second, standalone game on its own page (`/weltmeister`, linked from the nav so members find it). One bet for the whole tournament: **which nation becomes Weltmeister 2026.**

| | |
|---|---|
| **Einsatz** | 5 € per person, one pick |
| **Topf** | 5 € × number of people who picked |
| **Pot split** | 50 % to the *Abschlussparty*, 50 % split evenly among everyone who picked the actual champion |
| **Wett-Schluss** | An admin-set cut-off (default 12 June 2026, 04:00 Berlin — ~24 h after the opener), editable under `/admin/weltmeister` |
| **Visibility** | Before the cut-off each member sees only their own pick. After it, the full table of all picks is visible to everyone, sorted alphabetically by first name. |
| **Scoring** | Admin enters the actual world champion under `/admin/weltmeister` after the final; everyone who picked that nation wins an equal share. |

## What is deliberately *not* in scope

These are design choices, not roadmap gaps. Each one is in service of "the admin should not have to think about this app for more than five minutes a day."

- **No email, no SMS, no third-party auth.** A shared *gate passphrase* keeps non-members out of the signup flow. After that, each member has their own first name + last name + password. Password resets are admin-initiated (one-shot temp via WhatsApp). No email verification, no password-reset emails, no SSO. The model fits a group of ~30 friends who already know each other. It does not fit a public website.
- **No real-money handling.** The pot is a number on a page. Pay each other in cash, beer, or whatever your group settles on.
- **No automated score-fetching.** The admin watches the match (or checks Kicker the next morning) and types in the result. There is no FIFA API integration, no scraper, no AI agent. Deliberate — adds maybe 20 seconds per match, removes an entire dependency category.
- **No bracket prediction, no over/under, no props.** One score tip per match — plus the single **Weltmeister-Tipp** (see below). Nothing else.
- **No mobile app.** Works in mobile browsers, that's enough.
- **No multi-tournament support.** Each deployment runs one tournament. Starting a new one means wiping the matches and bets and re-seeding.

## Realistic admin overhead

For the WM 2026 (104 matches over roughly a month):

- **Before the tournament:** maybe an hour to enter the full *Spielplan*. Cuts down to 15-20 minutes if you do it via the SQL editor.
- **During the tournament:** ~5 minutes per matchday for opening betting on the games the group wants to tip on, plus typing in the regulation-time results.
- **End of tournament:** count the pot, hand out the winnings at the party, done.

Total admin time over a 4-week tournament: probably 5-10 hours. If that's too much, the app is too much.

## Self-hosting

Stack: **Next.js 15** (App Router, Server Actions), **Drizzle ORM**, **Neon Postgres** (serverless), deployed on **Vercel**. Plain Tailwind for styling. No client-side framework beyond React. No external auth, no email, no third-party SDKs.

```bash
git clone https://github.com/<your-fork>/becherfluesterer
cd becherfluesterer
npm install
cp .env.example .env.local        # fill in DATABASE_URL, COOKIE_SECRET, optionally ADMIN_PASSWORD
npm run db:push                    # push schema to your Neon database
npm run dev                        # → http://localhost:3000
```

First request goes to `/einrichten`. Set both passwords. From that moment on the app is live.

To deploy to Vercel: connect the repo, add the same environment variables under **Project Settings → Environment Variables**, and Vercel handles the rest. The free tier (Hobby) is more than enough for a 30-person Tippkreis.

### Upgrading from earlier deployments

If you ran an earlier version (the shared-passphrase + first-name-only model), both the schema and the cookie format have changed:

1. **Apply the migration.** Paste `db/migrations/0001_gated_signup.sql` into the Neon SQL Editor (or pipe via `psql`). It wipes the `users` table (cascades to `bets`) and reshapes it for per-user accounts. Old member names are not preserved — testers re-sign up. The `settings` row (admin password + gate passphrase) is untouched.
2. **Cookie format invalidation.** The viewer session cookie now carries a `v2|` version prefix. Old cookies still in members' browsers fail parsing cleanly and force a fresh `/anmelden` visit. The admin cookie format is unchanged; existing admin sessions survive.
3. **Members re-onboard once.** Share the gate passphrase (same value as the old viewer passphrase from `settings`) once via WhatsApp. Members visit `/anmelden`, type the passphrase, then sign up with first name + last name + a password they choose. Done.
4. **For the Weltmeister-Tipp,** apply `db/migrations/0002_weltmeister.sql` in the Neon SQL Editor (adds the `champion_bets` table and two `settings` columns). Run it directly — **not** via `db:push`, which can prompt on the NOT NULL cut-off default. A fresh `db:push` afterward should report no diff.

## Why "Becherflüsterer"?

*Becher* = mug/cup. *Flüsterer* = whisperer. The kind of person who can read the room at the Stammtisch by listening to the way someone sets down their beer. Not a serious football pundit — the friend who has opinions anyway and shares them at the *Mai-Andacht*.

## License

MIT — see [LICENSE](./LICENSE). Fork it for your own Tippkreis, change the rules, change the name, it's yours.
