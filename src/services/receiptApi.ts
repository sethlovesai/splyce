const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://splyce.onrender.com';
// Sent as x-api-key when set — pairs with the server's optional shared-secret
// gate. Left unset, the request goes through unauthenticated (server stays open).
const API_SECRET = process.env.EXPO_PUBLIC_API_SECRET;
// Generous enough to ride out a Render cold start; still bounded so a dead
// backend surfaces an error instead of hanging forever.
const REQUEST_TIMEOUT_MS = 45_000;

export type BackendReceipt = {
  isReceipt?: boolean;
  restaurantName: string | null;
  date: string | null;
  items: {
    id?: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  totals: {
    subtotal: number;
    tax: number;
    tip: number;
    serviceCharge?: number;
    total?: number;
    taxRate?: number;
  };
};

export async function parseReceiptViaBackend(base64: string): Promise<BackendReceipt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/api/parse-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_SECRET ? { 'x-api-key': API_SECRET } : {}),
      },
      body: JSON.stringify({ base64 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend error: ${res.status} ${text}`);
    }

    return (await res.json()) as BackendReceipt;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('The scan timed out. Check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
