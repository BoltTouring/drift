# API Endpoints

This directory contains server-side API endpoints for AI-generated content.

## Current Status

**GitHub Pages (Static Deployment)**: The `/api/feed` endpoint is **not available** on static hosting. The app automatically falls back to placeholder content.

## Supported Platforms

To enable AI-generated content, deploy to a platform that supports serverless functions:

### Vercel
1. Place `feed.ts` in `/api/feed.ts` (or `/api/feed/index.ts`)
2. Set `PPQ_API_KEY` environment variable in Vercel dashboard
3. Deploy - Vercel will automatically detect and serve the function

### Netlify
1. Place `feed.ts` in `/netlify/functions/feed.ts`
2. Set `PPQ_API_KEY` environment variable in Netlify dashboard
3. Deploy - Netlify will automatically detect and serve the function

### Cloudflare Pages
1. Place `feed.ts` in `/functions/api/feed.ts`
2. Set `PPQ_API_KEY` environment variable in Cloudflare dashboard
3. Deploy - Cloudflare will automatically detect and serve the function

## Environment Variables

Required:
- `PPQ_API_KEY`: Your PPQ.ai API key (never commit this to git)

## Endpoint: `/api/feed`

**Method**: GET

**Response**: JSON array of language learning items

```json
[
  {
    "id": "unique-id",
    "jp": "今日は天気がいいですね。",
    "en": "The weather is nice today, isn't it?",
    "level": "N5",
    "mediaPrompt": "A sunny day with clear blue sky"
  }
]
```

**Features**:
- 5-minute in-memory cache (prevents regeneration on every request)
- Returns 5 items per request
- Strict JSON response format
- Error handling with clear messages

## Fallback Behavior

If the endpoint is unavailable (static deployment), the frontend automatically:
1. Detects the missing endpoint (2s timeout)
2. Logs a console warning
3. Uses placeholder content (5 sample items)
4. App continues to work normally

No API keys are ever exposed to the client.
