# GWPV Cricket — Setup, Publishing, and Admin Guide

The Firebase web configuration and organizer UID are already included. This static site loads Firebase directly, so `npm install firebase` is not required.

## 1. Deploy the updated Firestore rules

This step is required because protected phone numbers now use a private organizer-only document.

1. Open Firebase Console → **Firestore Database → Rules**.
2. Open `firestore.rules` from this project and copy the complete contents.
3. Replace the rules in Firebase and select **Publish**.
4. Confirm that the organizer UID is `GHIfihuSOTTuUTriH6Jcb12ijZh2`.

Public visitors can read `tournaments/gwpv-2026`. Only the organizer can write it or read/write `tournamentPrivate/gwpv-2026`.

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
4. **Teams:** open each of the nine slots, enter the unique serial/name, captain, optional logo URL, assign a pool, and add up to 13 other players. The captain is always displayed first, making 14 players total.
5. Check **Publish captain’s phone number** only when that captain’s contact should be public. Player phones and unpublished captain numbers remain organizer-only.
6. **Matches:** select **New match**, choose registered teams, schedule in IST, and save.
7. **Committee:** add main committee, organizing team, and volunteers/supporting members.

## 5. Update live scores

1. Open **Matches** and select the match.
2. Change status to **Live**.
3. Enter runs, wickets, overs, current innings, batting team, and target where applicable.
4. Save after each update. Public viewers receive the update automatically and see the last-updated time.
5. Cricket overs must end in `.0` through `.5`. After `4.5`, the next completed legal ball is `5.0`.
6. At the end, set status to **Completed**, enter the result and optional Player of the Match/scorecards, then save.

## Troubleshooting

- **Missing or insufficient permissions:** republish the included `firestore.rules` and confirm the UID.
- **Private data blocked:** the updated rules have not been deployed yet.
- **Organizer cannot sign in:** enable Email/Password and confirm the user exists.
- **Login works locally but not on GitHub:** add `arunrahim11.github.io` to Authorized domains.
- **GitHub page is 404:** check the latest workflow in the Actions tab and the Pages source.
- **Old phone numbers exist in the public document:** after deploying rules, sign in and save any admin section once. The site migrates phone fields into the private document and removes private numbers from the public document.
