# Splyce Backend (Minimal)

Small Express server to keep your OpenAI API key off the client. It exposes `/api/parse-receipt` to accept a receipt image (base64 or file upload) and returns structured JSON from OpenAI.

## Setup

```bash
cd server
cp .env.example .env
# add your OPENAI_API_KEY
npm install
npm run dev   # or npm start
```

The server defaults to `PORT=4000`.

## Usage

POST `/api/parse-receipt`
- Send either JSON `{ "base64": "<image_base64>" }`
  - content-type: application/json
- Or multipart/form-data with a file field named `file`

Response: JSON payload from OpenAI (see prompt in `index.js`).

## Notes
- Keep `OPENAI_API_KEY` only in this server `.env`, never in the client.
- You can deploy this as a serverless function or hosted Node service.
- Add basic auth/rate limiting before production.
