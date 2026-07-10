import { Timestamp } from 'firebase/firestore';

/** A single guest's claim on an item. portion: 1 = full, 0.5 = half-shared, etc. */
export type ItemClaim = {
  guestId: string;
  guestName: string;
  portion: number;
};

export type SessionItem = {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  claims: ItemClaim[];
};

export type SessionGuest = {
  guestId: string;
  name: string;
  joinedAt: Timestamp;
};

export type SessionStatus = 'open' | 'closed';

/**
 * A live-splitting session document, stored in the `sessions` collection.
 * The Firestore document ID is the sessionId (so it isn't duplicated in the body).
 */
export type LiveSession = {
  sessionId: string;
  receiptId: string;
  hostId: string;
  status: SessionStatus;
  restaurantName: string;
  items: SessionItem[];
  guests: SessionGuest[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

/** The minimal receipt shape createSession needs from our existing data model. */
export type ReceiptInput = {
  receiptId?: string;
  restaurantName: string;
  items: { id: string; name: string; price: number; quantity: number }[];
};
