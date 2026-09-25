# GWPV Cricket Tournament

A responsive Firebase-powered tournament manager and public live-score website.

## Included

- Dashboard with live, upcoming, and completed matches
- Nine editable team slots, custom pools, captains, and player lists
- Live scoreboard with cricket-over validation and optional detailed scorecards
- Dedicated ball-by-ball scoring desk with correction and undo
- Automatic totals, wickets, legal overs, CRR, target, balls remaining, RRR, batter strike rate, and bowler economy
- Per-match overs, powerplay, bowler limit, expected duration, innings break, and match timer settings
- Public over summaries, powerplay indicators, commentary, and automatic batting/bowling tables
- Editable tournament details, announcements, committee, organizers, and volunteers
- One-organizer Firebase email/password login
- Real-time Firestore updates for every visitor
- Database-level privacy for unpublished phone numbers
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

Published tournament data is stored in `tournaments/gwpv-2026`. Protected player and unpublished captain phone numbers are stored separately in `tournamentPrivate/gwpv-2026`. Firestore rules allow public reads only for the published document and restrict every write plus private-data reads to the configured organizer UID.
