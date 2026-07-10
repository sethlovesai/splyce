import { LiveSession } from '../types/session';
import { SummaryEntry, Totals } from '../types/navigation';

/**
 * Bridges the live-session claims model (Stage 1) into the app's existing
 * SummaryEntry[] shape, so the Summary screen renders identically whether the
 * split came from the manual assignment flow or a live session.
 *
 * An item's cost is split across its claimants in proportion to their portions
 * (so two 0.5 claims = half each; a lone portion-1 claim = the full price).
 */

export type LiveClaimLine = {
  key: string;
  guestId: string;
  guestName: string;
  itemName: string;
  portion: number;
  amount: number; // pre-tax share for this single claim
};

function shareFor(itemPrice: number, portion: number, totalPortions: number): number {
  if (totalPortions <= 0) return 0;
  return itemPrice * (portion / totalPortions);
}

/** A human label prefix for a portion: '' for full, 'half of ' for 0.5, else 'N× '. */
export function portionLabel(portion: number): string {
  if (portion === 1) return '';
  if (portion === 0.5) return 'half of ';
  return `${portion}× `;
}

/** Flattened per-claim lines for the host's live watch list. */
export function flattenLiveClaims(session: LiveSession | null): LiveClaimLine[] {
  if (!session) return [];
  const lines: LiveClaimLine[] = [];
  session.items.forEach((item) => {
    const totalPortions = item.claims.reduce((sum, c) => sum + c.portion, 0);
    item.claims.forEach((c) => {
      lines.push({
        key: `${item.itemId}-${c.guestId}`,
        guestId: c.guestId,
        guestName: c.guestName,
        itemName: item.name,
        portion: c.portion,
        amount: Number(shareFor(item.price, c.portion, totalPortions).toFixed(2)),
      });
    });
  });
  return lines;
}

/**
 * Convert a live session's claims into SummaryEntry[], applying the same tax
 * distribution the manual flow uses (proportional to each person's subtotal).
 */
export function summarizeLiveSession(
  session: LiveSession | null,
  totals: Totals,
): SummaryEntry[] {
  if (!session) return [];
  const map: Record<string, SummaryEntry> = {};

  session.items.forEach((item) => {
    const totalPortions = item.claims.reduce((sum, c) => sum + c.portion, 0);
    item.claims.forEach((c) => {
      if (!map[c.guestId]) {
        map[c.guestId] = { name: c.guestName, itemsCount: 0, totalOwed: 0, items: [] };
      }
      const share = shareFor(item.price, c.portion, totalPortions);
      map[c.guestId].totalOwed += share;
      map[c.guestId].itemsCount += 1;
      map[c.guestId].items?.push({ name: item.name, share: Number(share.toFixed(2)) });
    });
  });

  return applyTax(Object.values(map), totals);
}

/** An expanded manual item that remembers which original receipt item it came from. */
export type ManualItem = {
  id: string; // expanded unit id (e.g. "abc-1")
  sourceId: string; // original receipt item id (matches SessionItem.itemId)
  name: string;
  price: number;
};

/**
 * Combine live guest claims with the host's manual per-person assignments into
 * one SummaryEntry[]. Conflict rule: a live claim ALWAYS wins — any item that
 * has at least one live claim is paid by its claimant(s) and is excluded from
 * manual assignment, so no item is charged twice.
 */
export function buildHybridSummary(
  liveSession: LiveSession | null,
  manualItems: ManualItem[],
  selectedByItem: Record<string, string[]>, // expanded itemId -> participant names
  totals: Totals,
): SummaryEntry[] {
  const map: Record<string, SummaryEntry> = {};
  const add = (name: string, itemName: string, share: number) => {
    if (!map[name]) map[name] = { name, itemsCount: 0, totalOwed: 0, items: [] };
    map[name].totalOwed += share;
    map[name].itemsCount += 1;
    map[name].items?.push({ name: itemName, share: Number(share.toFixed(2)) });
  };

  // 1. Live claims (and record which original items are spoken for).
  const claimedSourceIds = new Set<string>();
  if (liveSession) {
    liveSession.items.forEach((item) => {
      if (item.claims.length === 0) return;
      claimedSourceIds.add(item.itemId);
      const totalPortions = item.claims.reduce((s, c) => s + c.portion, 0);
      item.claims.forEach((c) => add(c.guestName, item.name, shareFor(item.price, c.portion, totalPortions)));
    });
  }

  // 2. Manual assignments — only for items no live guest claimed.
  manualItems.forEach((item) => {
    if (claimedSourceIds.has(item.sourceId)) return; // live wins
    const names = selectedByItem[item.id] ?? [];
    if (names.length === 0) return;
    const share = item.price / names.length;
    names.forEach((n) => add(n, item.name, share));
  });

  return applyTax(Object.values(map), totals);
}

/** Distribute tax proportionally to each person's pre-tax subtotal. */
function applyTax(entries: SummaryEntry[], totals: Totals): SummaryEntry[] {
  const taxRate =
    totals.taxRate ?? (totals.subtotal > 0 ? (totals.tax / totals.subtotal) * 100 : 0);
  return entries.map((entry) => {
    const taxAmount = taxRate > 0 ? entry.totalOwed * (taxRate / 100) : 0;
    return {
      ...entry,
      taxAmount: Number(taxAmount.toFixed(2)),
      taxRate: Number(taxRate.toFixed(2)),
      totalOwed: Number((entry.totalOwed + taxAmount).toFixed(2)),
      items: entry.items?.map((i) => ({ ...i, share: Number(i.share.toFixed(2)) })),
    };
  });
}
