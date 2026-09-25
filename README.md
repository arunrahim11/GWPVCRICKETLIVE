# GWPV Cricket Live

A mobile-first live tournament website for the GWPV Society Cricket Championship.

## Included

- Public live-score page with automatic Firestore updates
- Nine teams and 126 editable player records
- Public player phone numbers
- Pool A and Pool B fixtures
- Points tables, results, semifinals and final
- Rules and match procedure page
- One-organizer email/password login
- Mobile organizer dashboard
- GitHub Pages deployment workflow
- Firestore security rules

## Start here

Follow **[SETUP.md](SETUP.md)** to connect Firebase and publish the website.

## Local preview

```bash
npm run start
```

Open `http://localhost:8080`. Until Firebase is configured, the public page displays starter data and the organizer page displays the setup notice.

## Data design

All tournament information is stored in one document:

`tournaments/gwpv-2026`

The public website listens to this document in real time. The organizer dashboard updates the same document. Firestore rules allow public reading and restrict writes to the configured organizer UID.

## Privacy

This project intentionally displays player phone numbers publicly at the organizer's request. Obtain player consent before entering numbers. Anyone with access to the public website can view and copy them.
