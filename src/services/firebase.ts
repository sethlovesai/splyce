import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase config is read from EXPO_PUBLIC_* env vars (see .env).
 *
 * >>> PLUG IN YOUR CREDENTIALS HERE <<<
 * Set these in splyce-expo/.env (all are safe to expose in a client app —
 * Firebase web config keys are public identifiers, not secrets; access is
 * controlled by Firestore security rules, not by hiding these values):
 *
 *   EXPO_PUBLIC_FIREBASE_API_KEY=...
 *   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
 *   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
 *   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
 *   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
 *   EXPO_PUBLIC_FIREBASE_APP_ID=...
 *
 * You get these from the Firebase console:
 *   Project settings → General → Your apps → SDK setup and configuration.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

// Reuse the existing app on Fast Refresh instead of re-initializing.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeFirestore (vs getFirestore) lets us enable long-polling auto-detect,
// which is what makes real-time listeners reliable inside React Native / Hermes,
// where the default WebChannel streaming transport can silently stall.
let db: Firestore;
try {
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
  // Already initialized (e.g. Fast Refresh) — fall back to the existing instance.
  db = getFirestore(app);
}

/**
 * Give the HOST a stable identity via anonymous sign-in so Firestore rules can
 * enforce host-only actions (close/delete). Guests on the web page (a later
 * stage) stay unauthenticated and only get the public, field-constrained write
 * path. Requires enabling the Anonymous provider in the Firebase console:
 * Authentication → Sign-in method → Anonymous → Enable.
 *
 * Auth + React Native persistence are imported lazily here (rather than at the
 * top of the module) so that `db` and everything built on it stays importable
 * from plain Node — e.g. the verification script — where the RN AsyncStorage
 * module can't load. In the app, RN persistence is used; elsewhere it falls
 * back to default in-memory persistence.
 */
export async function ensureHostId(): Promise<string> {
  const { getAuth, initializeAuth, signInAnonymously, ...authMod } = await import(
    'firebase/auth'
  );

  let auth;
  try {
    // getReactNativePersistence exists at runtime but may be missing from types.
    const getReactNativePersistence = (authMod as any).getReactNativePersistence;
    const AsyncStorage = (await import('@react-native-async-storage/async-storage'))
      .default;
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Non-RN (Node/test) or already initialized: default persistence.
    auth = getAuth(app);
  }

  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

export { app, db };
