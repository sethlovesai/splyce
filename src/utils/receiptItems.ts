import { ReceiptItem } from '../types/navigation';

export type ExpandedItem = {
  id: string; // unique per unit, e.g. "drink-1", "drink-2"
  sourceId: string; // original receipt item id
  name: string; // gets a "(1 of 2)" suffix when the original had quantity > 1
  price: number; // unit price
  quantity: number; // always 1
};

/**
 * Expand a receipt into one row per unit, so a "Drinks ×2" line becomes two
 * separately-claimable "Drink (1 of 2)" / "(2 of 2)" rows at unit price.
 *
 * Used BOTH for the host's Select Items screen AND for creating the live session,
 * so the host and the guest web page see the exact same set of claimable rows
 * (same ids) — a guest can claim one specific unit, and two people ordering the
 * same item each grab a distinct row instead of colliding on one line.
 */
export function expandReceiptItems(items: ReceiptItem[]): ExpandedItem[] {
  return items.flatMap((item) => {
    const qty = Math.max(1, item.quantity || 1);
    const unitPrice = qty > 1 ? Number((item.price / qty).toFixed(2)) : item.price;
    return Array.from({ length: qty }).map((_, idx) => ({
      id: `${item.id}-${idx + 1}`,
      sourceId: item.id,
      name: qty > 1 ? `${item.name} (${idx + 1} of ${qty})` : item.name,
      price: unitPrice,
      quantity: 1,
    }));
  });
}

/**
 * Alert body for items that nobody has been assigned to / claimed, blocking a
 * split until they're handled. Names are deduped so two unclaimed units of the
 * same item ("Nuggets (1 of 2)", "Nuggets (2 of 2)") don't read as duplicates.
 */
export function unassignedItemsMessage(names: string[]): string {
  const unique = Array.from(new Set(names));
  if (unique.length === 1) {
    return `${unique[0]} hasn't been assigned to anyone — assign it before splitting.`;
  }
  return (
    `${unique.length} items haven't been assigned to anyone: ${unique.join(', ')}. ` +
    'Assign them before splitting.'
  );
}
