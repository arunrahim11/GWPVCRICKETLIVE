# GWPV Cricket Live — Setup and Publishing

You need a free Firebase project and a new GitHub repository. Complete the steps in order.

## 1. Create the Firebase project

1. Open <https://console.firebase.google.com/> and select **Create a project**.
2. Name it `GWPV Cricket Live`. Google Analytics is optional.
3. In **Project overview**, select the Web icon (`</>`).
4. Register the app as `gwpv-cricket-live`. Firebase Hosting is not required because GitHub Pages will host the website.
5. Firebase displays a `firebaseConfig` object. Keep this page open.

## 2. Firebase web configuration — completed

The supplied `js/firebase-config.js` is already connected to the `gwpv-cricket-live` Firebase project. You do not need to run `npm install firebase`; this static GitHub Pages project loads the modular Firebase browser SDK directly.

Only replace the configuration if you decide to use a different Firebase project.

Example structure:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Firebase web configuration identifies the project and is safe to include in a public website. Firestore Security Rules protect editing.

## 3. Create the live database

1. In Firebase, open **Build → Firestore Database**.
2. Select **Create database**.
3. Choose a location near India, if available for your project.
4. Start in **Production mode**.
5. Open the **Rules** tab.
6. You will paste the supplied `firestore.rules` after creating the organizer account in Step 4.

## 4. Create the single organizer account

1. Open **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Open the **Users** tab and select **Add user**.
4. Enter the organizer email and a strong password.
5. Copy the user's **UID** from the Users table.
6. Open `firestore.rules` and replace `PASTE_ORGANIZER_FIREBASE_UID` with that UID.
7. Return to **Firestore Database → Rules**, paste the complete contents of `firestore.rules`, and select **Publish**.

Do not share the organizer password. Public visitors do not need an account.

## 5. Create and publish the GitHub repository

1. Sign in at <https://github.com/new>.
2. Repository name: `gwpv-cricket-live`.
3. Set it to **Public** and create the repository without adding starter files.
4. Upload every file and folder from this project, including `.github` and `.nojekyll`.
5. Commit to the `main` branch.
6. Open the repository's **Settings → Pages**.
7. Under **Build and deployment**, select **GitHub Actions**.
8. Open the **Actions** tab and wait for “Deploy GWPV Cricket to GitHub Pages” to finish.

Your public address will normally be:

`https://YOUR-GITHUB-USERNAME.github.io/gwpv-cricket-live/`

Your organizer address will be:

`https://YOUR-GITHUB-USERNAME.github.io/gwpv-cricket-live/admin.html`

## 6. Allow the GitHub Pages domain in Firebase Authentication

1. Open **Firebase → Authentication → Settings → Authorized domains**.
2. Add `YOUR-GITHUB-USERNAME.github.io`.
3. Do not include `https://` or the repository path.

## 7. Initialize the tournament

1. Open the organizer address ending with `/admin.html`.
2. Sign in using the organizer email and password.
3. Select **Initialize tournament**.
4. Edit the tournament name, dates, venue, nine teams, 126 players, phone numbers, fixtures, rules and standings.

Every saved change is published to the public page in real time.

## Match-day workflow

1. Before the match, open **Matches**, choose the match and confirm teams, date, time and venue.
2. Set **Display priority** to “Feature on Live page”.
3. At the toss, add the toss information and set status to **Live**.
4. Update runs, wickets, overs and the live message after each over or important moment.
5. At the end, set status to **Completed**, enter the result and Player of the Match, then publish.
6. Open **Standings**, update played/won/lost/points/NRR and publish.

## Updating website code later

Edit files directly on GitHub or upload changed files and commit them to `main`. GitHub Actions republishes the website automatically. Tournament data and scores remain in Firebase and are not erased by code updates.

## Troubleshooting

- **Public page says Demo data:** Firebase values are still placeholders or invalid.
- **Organizer cannot sign in:** Enable Email/Password authentication and add the organizer user.
- **Missing or insufficient permissions:** Confirm that the UID in the published Firestore Rules exactly matches the organizer user UID.
- **Login works locally but not on GitHub:** Add the `github.io` domain to Firebase Authentication's authorized domains.
- **GitHub page is 404:** Confirm Pages source is GitHub Actions and the deployment workflow completed successfully.
