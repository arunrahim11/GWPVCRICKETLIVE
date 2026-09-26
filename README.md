# GWPV Cricket Tournament

A responsive Firebase-powered tournament manager and public live-score website.

## Included

- Dashboard with live, upcoming, and completed matches
- Pool fixture-chart generator with team-by-team schedules and rest rounds
- Nine editable team slots, custom pools, captains, and player lists
- Unique GWID field and duplicate validation for every captain and player
- Searchable public All Teammates directory with team number and phone numbers
- Organizer one-click import of the 2026 player-list phone numbers by GWID
- Organizer team-logo upload with a strict 100 KB limit
- Live scoreboard with cricket-over validation and optional detailed scorecards
- Dedicated ball-by-ball scoring desk with correction and undo
- Automatic totals, wickets, legal overs, CRR, target, balls remaining, RRR, batter strike rate, and bowler economy
- Per-match overs, powerplay, bowler limit, expected duration, innings break, and match timer settings
- Public over summaries, powerplay indicators, commentary, and automatic batting/bowling tables
- Editable tournament details, announcements, committee, organizers, and volunteers
- One-organizer Firebase email/password login
- Real-time Firestore updates for every visitor
- Public phone-number visibility in the All Teammates directory
- GitHub Pages deployment workflow

## Start here

Follow **[SETUP.md](SETUP.md)** to deploy the updated Firestore rules and publish the website.

## Local preview

```bash
npm run start
```

Open `http://localhost:8080` for the public site and `http://localhost:8080/admin.html` for administration.

## Scoring model

Each match stores an ordered delivery log for both innings. Published scores are derived from that log, so editing or deleting any delivery recalculates the scoreboard. Wides and no-balls add runs without consuming a legal ball; six legal balls complete an over. Match clocks use the actual start/end timestamps and show a live estimated finish based on the configured duration and scoring pace.

## Data and privacy

Published tournament data, including captain and player phone numbers, is stored in the publicly readable `tournaments/gwpv-2026` document and displayed in All Teammates. Contact backups are also retained in the organizer-only `tournamentPrivate/gwpv-2026` document. Uploaded logos use separate `teamLogos/{teamId}` documents so they do not inflate the live-score document. Firestore rules allow public reads for published information and logos while restricting every write plus backup reads to the configured organizer UID.
