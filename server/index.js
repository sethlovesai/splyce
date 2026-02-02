import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 4000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Accepts either base64 in JSON or an uploaded image file field named "file"
app.post('/api/parse-receipt', upload.single('file'), async (req, res) => {
  try {
    let base64 = req.body.base64;

    if (!base64 && req.file) {
      base64 = req.file.buffer.toString('base64');
    }

    if (!base64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const prompt =
      'You extract structured data from restaurant receipts. First, decide if the image is actually a receipt and if the receipt is visible. Return ONLY JSON matching this shape: { "isReceipt": boolean, "restaurantName": string|null, "date": string|null, "items": [ { "name": string, "price": number, "quantity": number } ], "totals": { "subtotal": number, "tax": number, "tip": number, "serviceCharge"?: number, "total": number } }. Use quantity 1 if not present. Round prices to two decimals. Never include markdown or code fences.';

    const controller = new AbortController();
    const timeoutMs = 10_000;
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Read the receipt image and return structured JSON.' },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ],
          },
        ],
        signal: controller.signal,
      });
    } catch (err) {
      if (timedOut) {
        return res
          .status(408)
          .json({ error: 'Server is waking up, please try again.' });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'No content returned from OpenAI' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse OpenAI response' });
    }

    return res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

app.listen(PORT, () => {
  console.log(`Splyce backend listening on port ${PORT}`);
});
