import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});
const PORT = process.env.PORT || 4000;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Render terminates TLS at a proxy, so trust the first hop — otherwise every
// request looks like it comes from the same proxy IP and the rate limiter would
// throttle all users together.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Optional shared-secret gate. If API_SHARED_SECRET is set, requests must send a
// matching x-api-key header; if it's unset the endpoint stays open, so this can
// roll out without breaking existing clients. A secret shipped in a mobile app
// is extractable, so this mainly deters casual URL abuse — Firebase App Check is
// the stronger upgrade if you want real attestation.
function requireApiKey(req, res, next) {
  const secret = process.env.API_SHARED_SECRET;
  if (!secret || req.headers['x-api-key'] === secret) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Throttle the expensive OpenAI-backed route per client IP.
const parseLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // generous for a real user, tight for a script
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scans — please wait a moment and try again.' },
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Accepts either base64 in JSON or an uploaded image file field named "file"
app.post('/api/parse-receipt', parseLimiter, requireApiKey, upload.single('file'), async (req, res) => {
  try {
    let base64 = req.body.base64;

    if (!base64 && req.file) {
      base64 = req.file.buffer.toString('base64');
    }

    if (!base64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Reject oversized images up front (base64 is ~4/3 the raw byte size).
    if (Math.floor(base64.length * 0.75) > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Image is too large. Please use a smaller photo.' });
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
      }, { signal: controller.signal });
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

// Final error handler — return generic JSON so no stack trace or HTML error page
// ever leaks to the client (e.g. multer upload-too-large).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ error: 'Upload too large.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Splyce backend listening on port ${PORT}`);
});
