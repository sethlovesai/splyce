import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { db } from './firebase';
import { LiveSession, ReceiptInput, SessionItem, GuestTotal } from '../types/session';

const SESSIONS = 'sessions';
// How long a live (open) session stays claimable. A meal + settling up realistically
// wraps within a few hours; after this the rules reject further guest writes.
const SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
// Once closed, keep the doc briefly so guests can still view their final total,
// then let Firestore's TTL policy reap it (see docs/README for enabling TTL).
const SESSION_CLOSED_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Reject a promise if it hasn't settled within `ms`. Used to time-box a Firestore
 * write so a stalled network/auth round-trip can't leave the UI hanging forever
 * with no feedback.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Whether a session is past its expiresAt deadline. Used by the host app to
 * show an "expired" state instead of a live one. This is a client-side
 * convenience only — the authoritative check that stops expired writes lives in
 * firestore.rules (notExpired()). Sessions with no expiresAt are treated as
 * live so a malformed doc never traps the host in a false "expired" state.
 */
export function isSessionExpired(session: LiveSession | null): boolean {
  if (!session?.expiresAt) return false;
  return Date.now() >= session.expiresAt.toMillis();
}

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
      : [...session.guests, { guestId, name: guestName, joinedAt: Timestamp.now(), ready: false }];

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
      guests: [...session.guests, { guestId, name: guestName, joinedAt: Timestamp.now(), ready: false }],
    });
  });
}

/**
 * Set a guest's readiness flag ("I'm Ready" on the web page). Lives inside the
 * `guests` array, so the existing guest-write rule already permits it — no rules
 * change needed. No-op if the session is closed or the guest isn't found.
 */
export async function setGuestReady(
  sessionId: string,
  guestId: string,
  ready: boolean,
): Promise<void> {
  const ref = doc(db, SESSIONS, sessionId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Session ${sessionId} not found`);
    const session = snap.data() as LiveSession;
    if (session.status !== 'open') return;
    const guests = session.guests.map((g) => (g.guestId === guestId ? { ...g, ready } : g));
    tx.update(ref, { guests });
  });
}

/**
 * Mark a session closed (host action). Optionally writes per-guest final totals
 * so the guest web page can show each person what they owe.
 */
export async function closeSession(
  sessionId: string,
  results?: Record<string, GuestTotal>,
): Promise<void> {
  const ref = doc(db, SESSIONS, sessionId);
  await updateDoc(ref, {
    status: 'closed',
    // Shorten the lifetime so the TTL policy reaps the closed doc within ~a day,
    // while still letting guests view their final total in the meantime.
    expiresAt: Timestamp.fromMillis(Date.now() + SESSION_CLOSED_GRACE_MS),
    ...(results ? { results } : {}),
  });
}

/**
 * Hard-delete a session (host action). Used when a host abandons a session before
 * splitting — there's no summary worth keeping, so remove the doc immediately
 * instead of leaving an unused row for the TTL policy to reap later.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, SESSIONS, sessionId));
}
