import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { db } from './firebase';
import { LiveSession, ReceiptInput, SessionItem } from '../types/session';

const SESSIONS = 'sessions';
const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Create a new live session from an existing parsed receipt.
 * Returns the generated sessionId (also the Firestore document ID).
 */
export async function createSession(
  receipt: ReceiptInput,
  hostId: string,
): Promise<string> {
  // Pre-generate the doc ref so we know the id before writing.
  const ref = doc(collection(db, SESSIONS));

  const items: SessionItem[] = receipt.items.map((item) => ({
    itemId: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    claims: [],
  }));

  await setDoc(ref, {
    sessionId: ref.id,
    receiptId: receipt.receiptId ?? ref.id,
    hostId,
    status: 'open',
    restaurantName: receipt.restaurantName,
    items,
    guests: [],
    createdAt: serverTimestamp(),
    // serverTimestamp() can't be arithmetic'd, so expiry is computed client-side.
    expiresAt: Timestamp.fromMillis(Date.now() + SESSION_TTL_MS),
  });

  return ref.id;
}

/**
 * Subscribe to real-time updates for a session.
 * Calls onUpdate with the latest LiveSession (or null if it doesn't exist).
 * Returns an unsubscribe function — call it to stop listening.
 */
export function subscribeToSession(
  sessionId: string,
  onUpdate: (session: LiveSession | null) => void,
  onError?: (error: Error) => void,
): () => void {
  const ref = doc(db, SESSIONS, sessionId);
  return onSnapshot(
    ref,
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as LiveSession) : null);
    },
    (error) => onError?.(error),
  );
}

/**
 * Add or update a guest's claim on a specific item.
 * Runs in a transaction so concurrent guests don't overwrite each other's
 * claims within the shared `items` array. Also registers the guest in the
 * session's `guests` list on their first claim.
 * A portion <= 0 removes the guest's claim on that item.
 */
export async function addGuestClaim(
  sessionId: string,
  itemId: string,
  guestId: string,
  guestName: string,
  portion: number,
): Promise<void> {
  const ref = doc(db, SESSIONS, sessionId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const session = snap.data() as LiveSession;
    if (session.status !== 'open') {
      throw new Error('Session is closed');
    }

    const items = session.items.map((item) => {
      if (item.itemId !== itemId) return item;
      const others = item.claims.filter((c) => c.guestId !== guestId);
      const claims =
        portion > 0 ? [...others, { guestId, guestName, portion }] : others;
      return { ...item, claims };
    });

    // Register the guest on first interaction.
    const guests = session.guests.some((g) => g.guestId === guestId)
      ? session.guests
      : [...session.guests, { guestId, name: guestName, joinedAt: Timestamp.now() }];

    tx.update(ref, { items, guests });
  });
}

/**
 * Register a guest in the session without claiming anything (e.g. as soon as
 * they enter their name). Adds to the `guests` array only; no-op if already
 * present or the session is closed.
 */
export async function addGuest(
  sessionId: string,
  guestId: string,
  guestName: string,
): Promise<void> {
  const ref = doc(db, SESSIONS, sessionId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Session ${sessionId} not found`);
    const session = snap.data() as LiveSession;
    if (session.status !== 'open') return;
    if (session.guests.some((g) => g.guestId === guestId)) return;
    tx.update(ref, {
      guests: [...session.guests, { guestId, name: guestName, joinedAt: Timestamp.now() }],
    });
  });
}

/** Mark a session closed (host action). */
export async function closeSession(sessionId: string): Promise<void> {
  const ref = doc(db, SESSIONS, sessionId);
  await updateDoc(ref, { status: 'closed' });
}
