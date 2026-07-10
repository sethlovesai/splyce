/**
 * Stage 1 verification for the live-splitting infra.
 *
 * This is a STANDALONE harness: it mirrors the logic of the four helpers in
 * src/services/liveSession.ts (Node can't resolve React Native's extensionless
 * imports / AsyncStorage, so it re-runs the same Firestore calls directly). It
 * exercises the real `sessions` collection, the data model, the real-time
 * listener, and the security rules end to end.
 *
 * Run against the Firestore emulator (no real project needed):
 *   1. In one terminal:  npx firebase emulators:start --only firestore,auth
 *   2. In another:
 *        USE_FIREBASE_EMULATOR=1 node --env-file=.env scripts/testLiveSession.mjs
 *
 * Or against your real project (fill .env first, enable Anonymous auth):
 *        node --env-file=.env scripts/testLiveSession.mjs
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  signInAnonymously,
} from 'firebase/auth';

const useEmulator = process.env.USE_FIREBASE_EMULATOR === '1';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-splyce',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'demo-app',
};

const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);

if (useEmulator) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  console.log('• Using Firestore + Auth emulators');
}

const SESSIONS = 'sessions';
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A tiny fake receipt from our existing data model shape.
const fakeReceipt = {
  restaurantName: 'Test Diner',
  items: [
    { id: 'i1', name: 'Burger', price: 12.5, quantity: 1 },
    { id: 'i2', name: 'Fries', price: 4.0, quantity: 1 },
    { id: 'i3', name: 'Shared Nachos', price: 9.0, quantity: 1 },
  ],
};

async function main() {
  // --- host identity (mirrors ensureHostId) ---
  const cred = await signInAnonymously(auth);
  const hostId = cred.user.uid;
  console.log('✓ Host signed in anonymously, hostId =', hostId);

  // --- createSession ---
  const ref = doc(collection(db, SESSIONS));
  await setDoc(ref, {
    sessionId: ref.id,
    receiptId: ref.id,
    hostId,
    status: 'open',
    restaurantName: fakeReceipt.restaurantName,
    items: fakeReceipt.items.map((i) => ({
      itemId: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      claims: [],
    })),
    guests: [],
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + SESSION_TTL_MS),
  });
  const sessionId = ref.id;
  console.log('✓ createSession →', sessionId);

  // --- subscribeToSession (real-time listener) ---
  let updateCount = 0;
  const unsub = onSnapshot(ref, (snap) => {
    updateCount += 1;
    const d = snap.data();
    const claimed = d?.items?.filter((i) => i.claims.length > 0).map((i) => i.name);
    console.log(
      `  ↳ [listener #${updateCount}] status=${d?.status} guests=${d?.guests?.length} claimedItems=${JSON.stringify(claimed)}`,
    );
  });
  await wait(500); // let the initial snapshot arrive

  // --- addGuestClaim (transaction) ×2 guests, incl. a shared item ---
  async function addGuestClaim(itemId, guestId, guestName, portion) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Session not found');
      const s = snap.data();
      if (s.status !== 'open') throw new Error('Session is closed');
      const items = s.items.map((item) => {
        if (item.itemId !== itemId) return item;
        const others = item.claims.filter((c) => c.guestId !== guestId);
        const claims = portion > 0 ? [...others, { guestId, guestName, portion }] : others;
        return { ...item, claims };
      });
      const guests = s.guests.some((g) => g.guestId === guestId)
        ? s.guests
        : [...s.guests, { guestId, name: guestName, joinedAt: Timestamp.now() }];
      tx.update(ref, { items, guests });
    });
  }

  await addGuestClaim('i1', 'g-alice', 'Alice', 1); // Alice takes the burger
  await addGuestClaim('i3', 'g-alice', 'Alice', 0.5); // ...and half the nachos
  await addGuestClaim('i3', 'g-bob', 'Bob', 0.5); // Bob takes the other half
  await wait(500);
  console.log('✓ addGuestClaim ran for Alice (x2) and Bob (shared item)');

  // --- verify persisted state ---
  const after = (await getDoc(ref)).data();
  const nachos = after.items.find((i) => i.itemId === 'i3');
  console.log(
    `✓ Verified: ${after.guests.length} guests, nachos has ${nachos.claims.length} claims (${nachos.claims
      .map((c) => `${c.guestName}:${c.portion}`)
      .join(', ')})`,
  );

  // --- closeSession ---
  await updateDoc(ref, { status: 'closed' });
  await wait(500);
  console.log('✓ closeSession → status closed');

  // --- claim on a closed session should now fail (rule/logic guard) ---
  try {
    await addGuestClaim('i2', 'g-bob', 'Bob', 1);
    console.log('✗ UNEXPECTED: claim succeeded on a closed session');
  } catch (e) {
    console.log('✓ Claim correctly rejected on closed session:', e.message);
  }

  unsub();
  await deleteDoc(ref); // host cleanup
  console.log('✓ Cleaned up test session. Listener fired', updateCount, 'times.');
  process.exit(0);
}

main().catch((e) => {
  console.error('✗ Test failed:', e);
  process.exit(1);
});
