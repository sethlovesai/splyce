import { LiveSession, GuestTotal } from '../types/session';
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

/** An expanded manual item that remembers which original receipt item it came from. */
export type ManualItem = {
  id: string; // expanded unit id (e.g. "abc-1")
  sourceId: string; // original receipt item id (matches SessionItem.itemId)
  name: string;
  price: number;
};

/** One person's computed pre-tax share of a single item. */
type ItemShare = {
  name: string;
  guestId?: string; // present only for live guests (used for per-guest web totals)
  itemName: string;
  amount: number;
};

/**
 * The single source of truth for who owes what. Live guest claims and the host's
 * manual per-person assignments are combined into one claimant list per original
 * item, and the item's cost is split across ALL of them in proportion to their
 * portions (live claims carry their own portion; each manual assignment counts as
 * a full portion of 1). A live claim never excludes a manual one — they share.
 */
function computeShares(
  liveSession: LiveSession | null,
  manualItems: ManualItem[],
  selectedByItem: Record<string, string[]>,
): ItemShare[] {
  type Claimant = { name: string; portion: number; guestId?: string };
  const perItem: Record<string, { name: string; price: number; claimants: Claimant[] }> = {};

  // Live claims — keyed by original itemId; item price is the full line price.
  liveSession?.items.forEach((item) => {
    perItem[item.itemId] = {
      name: item.name,
      price: item.price,
      claimants: item.claims.map((c) => ({ name: c.guestName, portion: c.portion, guestId: c.guestId })),
    };
  });

  // Manual assignments — each (unit, person) selection is one full-portion claim.
  // Session item ids are now unit-level, so match manual units by their own id.
  manualItems.forEach((unit) => {
    const bucket = perItem[unit.id];
    if (!bucket) return;
    (selectedByItem[unit.id] ?? []).forEach((name) => bucket.claimants.push({ name, portion: 1 }));
  });

  const shares: ItemShare[] = [];
  Object.values(perItem).forEach((entry) => {
    const totalPortions = entry.claimants.reduce((s, c) => s + c.portion, 0);
    entry.claimants.forEach((c) =>
      shares.push({
        name: c.name,
        guestId: c.guestId,
        itemName: entry.name,
        amount: shareFor(entry.price, c.portion, totalPortions),
      }),
    );
  });
  return shares;
}

/**
 * Combine live guest claims + the host's manual assignments into one
 * SummaryEntry[] (keyed by person name), applying tax proportionally.
 */
export function buildHybridSummary(
  liveSession: LiveSession | null,
  manualItems: ManualItem[],
  selectedByItem: Record<string, string[]>,
  totals: Totals,
): SummaryEntry[] {
  const map: Record<string, SummaryEntry> = {};
  computeShares(liveSession, manualItems, selectedByItem).forEach((s) => {
    if (!map[s.name]) map[s.name] = { name: s.name, itemsCount: 0, totalOwed: 0, items: [] };
    map[s.name].totalOwed += s.amount;
    map[s.name].itemsCount += 1;
    map[s.name].items?.push({ name: s.itemName, share: Number(s.amount.toFixed(2)) });
  });
  return applyTax(Object.values(map), totals);
}

/**
 * Per-guest final totals (keyed by guestId) for the guest web page — computed
 * from the combined claims (so a live guest's share correctly shrinks if the
 * host manually adds a co-claimant to their item), with tax applied.
 */
export function computeGuestTotals(
  liveSession: LiveSession | null,
  manualItems: ManualItem[],
  selectedByItem: Record<string, string[]>,
  totals: Totals,
): Record<string, GuestTotal> {
  const res: Record<string, GuestTotal> = {};
  computeShares(liveSession, manualItems, selectedByItem).forEach((s) => {
    if (!s.guestId) return; // only live guests get a web total
    if (!res[s.guestId]) res[s.guestId] = { name: s.name, subtotal: 0, tax: 0, total: 0 };
    res[s.guestId].subtotal += s.amount;
  });

  const taxRate =
    totals.taxRate ?? (totals.subtotal > 0 ? (totals.tax / totals.subtotal) * 100 : 0);
  Object.values(res).forEach((r) => {
    const tax = taxRate > 0 ? r.subtotal * (taxRate / 100) : 0;
    r.tax = Number(tax.toFixed(2));
    r.subtotal = Number(r.subtotal.toFixed(2));
    r.total = Number((r.subtotal + r.tax).toFixed(2));
  });
  return res;
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
