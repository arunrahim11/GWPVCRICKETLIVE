// Replace every placeholder below with the Web App configuration shown in:
// Firebase Console → Project settings → Your apps → SDK setup and configuration.
// Firebase web config values identify a project; security is enforced by Firestore Rules.
export const firebaseConfig = {
  apiKey: "AIzaSyBCmTI6RPELaG0MsWOg-iTVju58RIMWCnc",
  authDomain: "gwpv-cricket-live.firebaseapp.com",
  projectId: "gwpv-cricket-live",
  storageBucket: "gwpv-cricket-live.firebasestorage.app",
  messagingSenderId: "994440422426",
  appId: "1:994440422426:web:164333bf0dab24dd459da3",
  measurementId: "G-PTFSLDCPY4"
};

export const tournamentDocumentPath = ["tournaments", "gwpv-2026"];

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(value => value && !String(value).startsWith("PASTE_"));
}
