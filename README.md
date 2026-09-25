# GWPV Cricket Tournament

A responsive Firebase-powered tournament manager and public live-score website.

## Included

- Dashboard with live, upcoming, and completed matches
- Nine editable team slots, custom pools, captains, and player lists
- Live scoreboard with cricket-over validation and optional detailed scorecards
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

## Data and privacy

Published tournament data is stored in `tournaments/gwpv-2026`. Protected player and unpublished captain phone numbers are stored separately in `tournamentPrivate/gwpv-2026`. Firestore rules allow public reads only for the published document and restrict every write plus private-data reads to the configured organizer UID.
