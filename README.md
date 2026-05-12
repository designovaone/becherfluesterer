# Becherflüsterer

> A small, private football betting pool for a close group of friends. €2 per tip, the best tip per match wins, half the pot pays for the closing party. No accounts, no jackpots, no real-money handling. Just a paper pool that runs in a browser.

Becherflüsterer is built for a single tournament (the FIFA World Cup 2026 in the first version, but adaptable). A group of friends share a single *Passphrase*, each adds their name on first entry, and from then on they tip on whichever matches the admin has opened for betting. Scoring is dead simple. The whole thing is meant to disappear into the background of game day, not be a hobby in itself.

If you are looking for an OddsCalculator-style platform with brackets, props, jackpots, automated scoring, and per-user logins, this is the wrong project. It is a *Stammtisch*-style Tippkreis with as little overhead as possible.

## How members experience it

1. Open the website. See the title, the tagline, two buttons.
2. Click **"Mit Passphrase eintreten"**, enter the shared passphrase + a display name. First entry creates your account automatically.
3. On **Spiele**, see every match the admin has opened. Enter a Tipp. Edit it whenever you want — up to 10 minutes before *Anpfiff*.
4. After kickoff, the page shows everyone's tip publicly. After the match is finalized, winners are highlighted and the pot per match is shown.
5. The **Rangliste** is the running scoreboard, sorted by winnings in €, then by wins, then by tips placed.

That's it. No notifications, no app to install, no dashboard. Works in any phone browser.

## How the admin experiences it

**One-time setup.** On the very first visit, `/einrichten` asks you to set two things: an admin password (just for you) and the shared viewer passphrase (for everyone else). Both are hashed and stored. The setup page locks itself afterwards.

**Before the tournament.** Add the matches one by one — two teams, stage, kickoff in local time. You can also import a match list later via SQL if you prefer.

**During the tournament.** Per matchday, roughly five minutes of work:
- Open betting on the games the group wants to tip on. Games involving Germany auto-open; everything else stays closed unless you flip the chip.
- After each match ends, enter the 90-minute result and tick **Endgültig**. The Rangliste recalculates instantly.
- That's the whole loop.

**See who tipped what.** Each match card on `/admin/spiele` shows every member's prediction inline, with winners highlighted once you finalize the score. No separate report to run.

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

## What is deliberately *not* in scope

These are design choices, not roadmap gaps. Each one is in service of "the admin should not have to think about this app for more than five minutes a day."

- **No individual user accounts.** One shared passphrase for all members. Security model is *trust* — if someone you know misuses the system, that is a social problem, not a software one. The model fits a group of ~30 friends who already know each other. It does not fit a public website.
- **No real-money handling.** The pot is a number on a page. Pay each other in cash, beer, or whatever your group settles on.
- **No automated score-fetching.** The admin watches the match (or checks Kicker the next morning) and types in the result. There is no FIFA API integration, no scraper, no AI agent. Deliberate — adds maybe 20 seconds per match, removes an entire dependency category.
- **No bracket prediction, no "Wer wird Weltmeister", no over/under, no props.** One score tip per match. That's it.
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

## Why "Becherflüsterer"?

*Becher* = mug/cup. *Flüsterer* = whisperer. The kind of person who can read the room at the Stammtisch by listening to the way someone sets down their beer. Not a serious football pundit — the friend who has opinions anyway and shares them at the *Mai-Andacht*.

## License

MIT — see [LICENSE](./LICENSE). Fork it for your own Tippkreis, change the rules, change the name, it's yours.
