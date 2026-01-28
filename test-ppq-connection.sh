#!/usr/bin/env bash
set -euo pipefail

# Load env if present
if [[ -f ".env.local" ]]; then
  set -a
  source ".env.local"
  set +a
fi

if [[ -z "${PPQ_API_KEY:-}" ]]; then
  echo "❌ PPQ_API_KEY not set"
  exit 1
fi

echo "🔑 API key loaded"
echo "🌐 Testing PPQ.ai API connection using model=auto..."

response=$(curl -sS -w '\n%{http_code}' \
  -X POST https://api.ppq.ai/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PPQ_API_KEY" \
  -d '{
    "model": "auto",
    "messages": [
      {
        "role": "user",
        "content": "Return ONLY JSON: {\"ok\":true,\"jp\":\"こんにちは\",\"en\":\"Hello\"}"
      }
    ],
    "temperature": 0.2,
    "max_tokens": 200
  }')

http_code="$(echo "$response" | tail -n1)"
body="$(echo "$response" | sed '$d')"

if [[ "$http_code" != "200" ]]; then
  echo "❌ API returned HTTP $http_code"
  echo "Response:"
  echo "$body" | jq . 2>/dev/null || echo "$body"
  exit 1
fi

echo "✅ Success (HTTP 200)"
echo "$body" | jq . 2>/dev/null || echo "$body"
