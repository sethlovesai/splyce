import * as FileSystem from 'expo-file-system';
import { ReceiptItem, Totals } from '../types/navigation';

export type ParsedReceipt = {
  restaurantName: string | null;
  date: string | null;
  items: ReceiptItem[];
  totals: Totals & { total?: number };
};

const MODEL = 'gpt-4o-mini';

export async function parseReceiptWithOpenAI(base64: string): Promise<ParsedReceipt> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  }

  // const base64 = await FileSystem.readAsStringAsync(imageUri, 'base64');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'You extract structured data from restaurant receipts. First, decide if the image is actually a receipt and if the receipt is visible. Return ONLY JSON matching this shape: { "isReceipt": boolean, "restaurantName": string|null, "date": string|null, "items": [ { "name": string, "price": number, "quantity": number } ], "totals": { "subtotal": number, "tax": number, "tip": number, "serviceCharge"?: number, "total": number } }. Use quantity 1 if not present. Round prices to two decimals. Never include markdown or code fences.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Read the receipt image and return structured JSON.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log('data', data);
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  console.log('content', content);
  if (!content) {
    throw new Error('No content returned from OpenAI');
  }

  const parsed = safeJsonParse(content.trim());
  if (!parsed) {
    throw new Error('Could not parse OpenAI response');
  }

  return normalizeParsed(parsed);
}

function safeJsonParse(text: string) {
  try {
    // Handle accidental code fences
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

function normalizeParsed(raw: any): ParsedReceipt {
  const items: ReceiptItem[] = Array.isArray(raw?.items)
    ? raw.items
        .filter((i: any) => i && i.name)
        .map((i: any, idx: number) => ({
          id: String(idx + 1),
          name: String(i.name),
          price: Number(i.price ?? 0),
          quantity: Number(i.quantity ?? 1),
        }))
    : [];

  const totals: Totals & { total?: number } = {
    subtotal: Number(raw?.totals?.subtotal ?? 0),
    tax: Number(raw?.totals?.tax ?? 0),
    tip: Number(raw?.totals?.tip ?? 0),
    serviceCharge: raw?.totals?.serviceCharge ? Number(raw?.totals?.serviceCharge) : undefined,
    total: raw?.totals?.total ? Number(raw?.totals?.total) : undefined,
  };

  // If total missing, derive one.
  if (!totals.total || Number.isNaN(totals.total)) {
    totals.total = Number((totals.subtotal + totals.tax + totals.tip + (totals.serviceCharge ?? 0)).toFixed(2));
  }

  if (totals.subtotal > 0 && totals.tax > 0) {
    totals.taxRate = Number(((totals.tax / totals.subtotal) * 100).toFixed(2));
  }

  return {
    restaurantName: raw?.restaurantName ?? null,
    date: raw?.date ?? null,
    items,
    totals,
  };
}
