import { firebaseConfig, isFirebaseConfigured, tournamentDocumentPath } from "./firebase-config.js";

let servicesPromise;

export async function getFirebaseServices() {
  if (!isFirebaseConfigured()) return null;
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js")
    ]).then(([appSdk, firestoreSdk, authSdk]) => {
      const app = appSdk.initializeApp(firebaseConfig);
      const db = firestoreSdk.getFirestore(app);
      const auth = authSdk.getAuth(app);
      const tournamentRef = firestoreSdk.doc(db, ...tournamentDocumentPath);
      return { app, db, auth, tournamentRef, firestoreSdk, authSdk };
    });
  }
  return servicesPromise;
}
