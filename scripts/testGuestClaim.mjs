/**
 * Stage 3 verification: the UNAUTHENTICATED guest write path + rule constraints.
 *
 * Stages 1–2 only exercised the host (authenticated) path. This proves the
 * security rules actually allow an anonymous guest to read a session and claim
 * items, while blocking them from tampering with anything else.
 *
 *   node --env-file=.env scripts/testGuestClaim.mjs
 *
 * Uses two Firebase app instances: `host` (anonymous auth, creates the session)
 * and `guest` (NO auth — exactly like the web page).
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, doc, setDoc, updateDoc, getDoc, deleteDoc,
  runTransaction, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const hostApp = initializeApp(config, 'host');
const guestApp = initializeApp(config, 'guest'); // separate instance, never authed
const hostDb = getFirestore(hostApp);
const guestDb = getFirestore(guestApp);

const pass = (m) => console.log('✓', m);
const fail = (m) => { console.log('✗', m); process.exitCode = 1; };

async function main() {
  // --- HOST creates a session ---
  const hostId = (await signInAnonymously(getAuth(hostApp))).user.uid;
  const ref = doc(collection(hostDb, 'sessions'));
  await setDoc(ref, {
    sessionId: ref.id, receiptId: ref.id, hostId, status: 'open',
    restaurantName: 'Guest Test Cafe',
    items: [
      { itemId: 'i1', name: 'Latte', price: 5.0, quantity: 1, claims: [] },
      { itemId: 'i2', name: 'Cake', price: 8.0, quantity: 1, claims: [] },
    ],
    guests: [],
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 6 * 3600 * 1000),
  });
  pass(`Host created session ${ref.id}`);

  const gRef = doc(guestDb, 'sessions', ref.id);
  const guestId = 'g-web-test';

  // 1. Guest (no auth) can READ.
  try {
    const snap = await getDoc(gRef);
    snap.exists() ? pass('Guest can READ session (unauthenticated)')
                  : fail('Guest read returned nothing');
  } catch (e) { fail('Guest READ denied: ' + e.code); }

  // 2. Guest can CLAIM (write items + guests) on an open session.
  try {
    await runTransaction(guestDb, async (tx) => {
      const s = (await tx.get(gRef)).data();
      const items = s.items.map((it) =>
        it.itemId === 'i1'
          ? { ...it, claims: [...it.claims, { guestId, guestName: 'WebGuest', portion: 1 }] }
          : it);
      const guests = [...s.guests, { guestId, name: 'WebGuest', joinedAt: Timestamp.now() }];
      tx.update(gRef, { items, guests });
    });
    pass('Guest CLAIM accepted (items + guests write)');
  } catch (e) { fail('Guest CLAIM denied: ' + e.code); }

  // 3. Guest must NOT be able to change status (rule: onlyClaimFieldsChanged).
  try {
    await updateDoc(gRef, { status: 'closed' });
    fail('Guest was able to change status (should be blocked!)');
  } catch (e) { pass('Guest BLOCKED from changing status: ' + e.code); }

  // 4. Guest must NOT be able to change hostId / receiptId.
  try {
    await updateDoc(gRef, { hostId: 'attacker' });
    fail('Guest was able to change hostId (should be blocked!)');
  } catch (e) { pass('Guest BLOCKED from changing hostId: ' + e.code); }

  // 5. Guest must NOT be able to delete the session.
  try {
    await deleteDoc(gRef);
    fail('Guest was able to delete session (should be blocked!)');
  } catch (e) { pass('Guest BLOCKED from deleting session: ' + e.code); }

  // 6. After host closes, guest claims must be rejected.
  await updateDoc(ref, { status: 'closed' });
  try {
    await runTransaction(guestDb, async (tx) => {
      const s = (await tx.get(gRef)).data();
      tx.update(gRef, { items: s.items });
    });
    fail('Guest claimed on a CLOSED session (should be blocked!)');
  } catch (e) { pass('Guest BLOCKED from claiming on closed session: ' + e.code); }

  await deleteDoc(ref); // host cleanup
  pass('Cleaned up test session');
  console.log(process.exitCode ? '\nSOME CHECKS FAILED' : '\nALL GUEST-PATH CHECKS PASSED');
  process.exit(process.exitCode || 0);
}

main().catch((e) => { console.error('✗ Test crashed:', e); process.exit(1); });
