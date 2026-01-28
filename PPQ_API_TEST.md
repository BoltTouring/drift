# PPQ.ai API Connection Test

## Status

The API endpoint has been configured and is ready to use. The connection cannot be tested from this environment due to network/DNS limitations, but the configuration is correct.

## Configuration

- **Endpoint**: `POST https://api.ppq.ai/chat/completions`
- **Model**: `claude-3.5-sonnet` (PPQ.ai recommended)
- **API Key**: Loaded from `.env.local` (not committed to git)
- **Response Format**: JSON object with `items` array

## Test the Connection

Run the test script from your local terminal:

```bash
./test-ppq-connection.sh
```

Or test manually with curl:

```bash
source <(grep PPQ_API_KEY .env.local | sed 's/^/export /')
curl -X POST https://api.ppq.ai/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PPQ_API_KEY" \
  -d '{
    "model": "claude-3.5-sonnet",
    "messages": [
      {
        "role": "system",
        "content": "You are a Japanese language learning content generator. Generate exactly 2 language learning items for testing. Return a JSON object with an \"items\" array."
      },
      {
        "role": "user",
        "content": "Generate 2 Japanese language learning items. Return as JSON object with \"items\" array."
      }
    ],
    "response_format": { "type": "json_object" },
    "temperature": 0.7,
    "max_tokens": 1000
  }'
```

## Expected Response Format

```json
{
  "choices": [{
    "message": {
      "content": "{\"items\": [{\"id\": \"...\", \"jp\": \"...\", \"en\": \"...\", \"level\": \"N5\", \"mediaPrompt\": \"...\"}]}"
    }
  }]
}
```

## Implementation

The API endpoint is implemented in:
- **Server-side**: `api/feed.ts` (for serverless platforms)
- **Client-side loader**: `src/lib/ppqFeed.ts` (with fallback to placeholder)

The API key is **never** exposed to the client - it only runs server-side.

## Deployment

When deploying to a serverless platform (Vercel, Netlify, Cloudflare Pages):
1. Set the `PPQ_API_KEY` environment variable in your platform's dashboard
2. The `/api/feed` endpoint will automatically work
3. The frontend will fetch from this endpoint instead of using placeholders
