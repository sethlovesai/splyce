const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://splyce.onrender.com';

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
  const res = await fetch(`${API_BASE}/api/parse-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as BackendReceipt;
  return data;
}
