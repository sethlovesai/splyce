export const RECEIPT_CATEGORIES = ['Eating out', 'Coffee', 'Drinks', 'Groceries', 'Other bills'] as const;

export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

export const DEFAULT_CATEGORY: ReceiptCategory = 'Other bills';

// The backend asks an LLM for a category alongside the OCR parse, so this
// guards against anything that isn't an exact match (wrong case, a synonym,
// a hallucinated label) rather than trusting it outright.
export function normalizeCategory(value: string | null | undefined): ReceiptCategory {
  if (!value) return DEFAULT_CATEGORY;
  const match = RECEIPT_CATEGORIES.find((c) => c.toLowerCase() === value.trim().toLowerCase());
  return match ?? DEFAULT_CATEGORY;
}
