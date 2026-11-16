import { doc, getDoc, runTransaction } from 'firebase/firestore';

import { db, ensureHostId } from './firebase';

/**
 * Free-tier scan counting. Keyed by the host's anonymous Firebase Auth uid (the
 * same device-persistent identity used for live sessions, see ensureHostId), one
 * doc per user at `usage/{uid}`: { scanCount, monthKey }.
 *
 * Unlock status is NOT tracked here — that's RevenueCat's "Splyce Pro"
 * entitlement (see services/iap.ts), which is validated server-side and can't be
 * faked by editing Firestore. This doc only counts scans within the current
 * calendar month for the free tier.
 */

const USAGE = 'usage';
export const FREE_SCANS_PER_MONTH = 3;

export type UsageState = {
  scanCount: number; // scans used in the current calendar month
  monthKey: string; // "YYYY-MM"
};

/** Current calendar-month key, e.g. "2026-07". */
export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Free scans still available this month (before considering the unlock). */
export function hasFreeScansLeft(usage: UsageState): boolean {
  return usage.scanCount < FREE_SCANS_PER_MONTH;
}

/** Free scans left this month (0 once the allowance is spent). */
export function scansRemaining(usage: UsageState): number {
  return Math.max(0, FREE_SCANS_PER_MONTH - usage.scanCount);
}

/**
 * Read the user's usage, applying the monthly reset: if the stored monthKey isn't
 * the current month, the effective scanCount is 0. The doc is only rewritten on
 * the next successful scan, so a read never costs a write.
 */
export async function getUsage(): Promise<UsageState> {
  const uid = await ensureHostId();
  const snap = await getDoc(doc(db, USAGE, uid));
  const month = currentMonthKey();
  if (!snap.exists()) return { scanCount: 0, monthKey: month };
  const data = snap.data() as Partial<UsageState>;
  return {
    scanCount: data.monthKey === month ? data.scanCount ?? 0 : 0,
    monthKey: month,
  };
}

/**
 * Record one successful scan. Resets the count to 1 when the month rolls over.
 * Runs in a transaction so rapid scans can't clobber the count. (Callers skip
 * this for unlocked users — an unlocked user's count is never gated on.)
 */
export async function recordScan(): Promise<void> {
  const uid = await ensureHostId();
  const ref = doc(db, USAGE, uid);
  const month = currentMonthKey();
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? (snap.data() as Partial<UsageState>) : {};
    const sameMonth = data.monthKey === month;
    const nextCount = (sameMonth ? data.scanCount ?? 0 : 0) + 1;
    tx.set(ref, { scanCount: nextCount, monthKey: month }, { merge: true });
  });
}
