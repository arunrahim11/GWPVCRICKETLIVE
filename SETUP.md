# GWPV Cricket — Setup, Publishing, and Admin Guide

The Firebase web configuration and organizer UID are already included. This static site loads Firebase directly, so `npm install firebase` is not required.

## 1. Deploy the updated Firestore rules

This step is required because the site uses an organizer-only contact backup and uploaded logos use separate public logo documents.

1. Open Firebase Console → **Firestore Database → Rules**.
2. Open `firestore.rules` from this project and copy the complete contents.
3. Replace the rules in Firebase and select **Publish**.
4. Confirm that the organizer UID is `GHIfihuSOTTuUTriH6Jcb12ijZh2`.

Public visitors can read `tournaments/gwpv-2026`, including the captain and player phone numbers shown in All Teammates. Only the organizer can write it or read/write the contact backup in `tournamentPrivate/gwpv-2026`.

## 2. Confirm organizer login

1. Open Firebase → **Authentication → Sign-in method** and enable **Email/Password**.
2. Under **Users**, make sure the organizer account with the UID above exists.
3. In **Authentication → Settings → Authorized domains**, add `arunrahim11.github.io`.
4. Keep the organizer password private.

## 3. Publish the code on GitHub Pages

1. Upload or replace all files in the `arunrahim11/GWPVCRICKETLIVE` repository, preserving the folders.
2. Commit the changes to `main`.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions** if it is not already selected.
5. Open **Actions** and wait for the Pages deployment to finish.

Public site: <https://arunrahim11.github.io/GWPVCRICKETLIVE/>

Admin login: <https://arunrahim11.github.io/GWPVCRICKETLIVE/admin.html>

## 4. Enter the tournament

1. Sign in on `admin.html`. If the database is empty, select **Initialize tournament**.
2. **Settings:** enter the editable tournament name, venue, dates, and announcement.
3. **Pools:** create and name any number of pools, then save.
4. **Teams:** open each of the nine slots, enter the unique serial/name, captain, captain GWID, optional logo URL, assign a pool, and add up to 13 other players. Enter a unique GWID for every player. The captain is always displayed first, making 14 players total. Use **Import Word-list phone numbers** to apply the provided 2026 phone list by GWID, with unique-name matching only for the three roster entries whose GWID differs from the numbered list; confirm to publish those numbers in All Teammates.
5. Upload a JPG, PNG, WebP, or GIF team logo directly in the team editor. The file must be 100 KB or smaller. The logo appears on team cards, live scores, match scoreboards, and the player directory.
6. Captain and player phone numbers are displayed in the public All Teammates directory.
7. **Matches:** select **New match**, choose registered teams, schedule in IST, set the overs, powerplay, maximum overs per bowler, expected duration, and innings-break time, then save.
8. **Committee:** add main committee, organizing team, and volunteers/supporting members.

## 5. Update live scores

1. Open **Live Scoring**, select the scheduled match, and press **Start match**.
2. Select the striker, non-striker, and bowler. Use the quick `0, 1, 2, 3, 4, 6` buttons or select an extra/wicket and add the delivery.
3. Wides and no-balls do not consume a legal ball. The website automatically calculates score, wickets, overs, CRR, player figures, over summaries, and powerplay status.
4. Use **Edit**, **Delete**, or **Undo last** to correct scoring errors. Every correction recalculates the complete innings.
5. After the first innings, press **Start 2nd innings**. The target, runs required, balls remaining, and required run rate are calculated automatically.
6. Add optional commentary to any delivery. Public viewers receive updates in real time.
7. At the end, enter the result in **Matches**, then press **Complete match** in Live Scoring. The actual match duration is saved and displayed.

## Troubleshooting

- **Logo upload denied:** publish the included `firestore.rules` in Firebase Console and confirm the signed-in organizer UID matches the UID in the rules.
- **Missing or insufficient permissions:** republish the included `firestore.rules` and confirm the UID.
- **Private data blocked:** the updated rules have not been deployed yet.
- **Organizer cannot sign in:** enable Email/Password and confirm the user exists.
- **Login works locally but not on GitHub:** add `arunrahim11.github.io` to Authorized domains.
- **GitHub page is 404:** check the latest workflow in the Actions tab and the Pages source.
- **Phone numbers are missing from the public directory:** sign in to the admin site and save any admin section once. The site restores contact details from the organizer-only backup and publishes them in the public tournament document.
