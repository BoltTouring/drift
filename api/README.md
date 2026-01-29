# API Endpoints

This directory contains server-side API endpoints for AI-generated content and audio.

## Current Status

**GitHub Pages (Static Deployment)**: The API endpoints are **not available** on static hosting. The app automatically falls back to placeholder content.

## Supported Platforms

To enable AI-generated content, deploy to a platform that supports serverless functions:

### Vercel
1. Place files in `/api/` directory
2. Set environment variables in Vercel dashboard
3. Deploy - Vercel will automatically detect and serve the functions

### Netlify
1. Place files in `/netlify/functions/`
2. Set environment variables in Netlify dashboard
3. Deploy

### Cloudflare Pages
1. Place files in `/functions/api/`
2. Set environment variables in Cloudflare dashboard
3. Deploy

## Environment Variables

Required:
- `PPQ_API_KEY`: Your PPQ.ai API key (for AI content generation)

Optional:
- `VOICEVOX_URL`: VoiceVox engine URL (default: `http://localhost:50021`)

## VoiceVox Setup (for Japanese Audio)

VoiceVox provides natural-sounding Japanese TTS. To enable audio:

### Docker (Recommended)
```bash
docker run -d -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest
```

### GPU-accelerated
```bash
docker run -d --gpus all -p 50021:50021 voicevox/voicevox_engine:nvidia-ubuntu20.04-latest
```

### Verify it's running
```bash
curl http://localhost:50021/version
```

## Endpoints

### `GET /api/feed`

Returns AI-generated Japanese learning content.

**Query Parameters**:
- `audio=1`: Include VoiceVox-generated audio URLs (requires VoiceVox running)

**Response**:
```json
{
  "items": [
    {
      "id": "unique-id",
      "jp": "今日は天気がいいですね。",
      "en": "The weather is nice today, isn't it?",
      "level": "N5",
      "mediaPrompt": "A sunny day with clear blue sky",
      "audioUrl": "data:audio/wav;base64,..."
    }
  ]
}
```

### `GET /api/tts`

Generate audio for any Japanese text.

**Query Parameters**:
- `text`: Japanese text to synthesize (required, max 500 chars)
- `format`: `wav` (raw audio) or `dataurl` (base64 data URL, default)
- `speaker`: VoiceVox speaker ID (default: 2 = 四国めたん)

**Response** (format=dataurl):
```json
{
  "audioUrl": "data:audio/wav;base64,..."
}
```

**Response** (format=wav):
Raw WAV audio bytes.

### VoiceVox Speaker IDs

| ID | Name | Description |
|----|------|-------------|
| 2 | 四国めたん (ノーマル) | Clear, good for learning |
| 3 | ずんだもん (ノーマル) | Cute, popular |
| 8 | 春日部つむぎ | Young female |
| 14 | 冥鳴ひまり | Mature female |
| 21 | 剣崎雌雄 | Male voice |

## Fallback Behavior

If endpoints are unavailable (static deployment), the frontend automatically:
1. Detects the missing endpoint
2. Uses placeholder content (5 sample items)
3. App continues to work normally (without audio)

No API keys are ever exposed to the client.

## Caching

- Feed: 5-minute in-memory cache
- TTS: 1-hour in-memory cache (up to 100 items)

## Architecture

```
Client (Browser)
    │
    ├─── /api/feed?audio=1 ──→ Server
    │                              │
    │                              ├── PPQ.ai (content generation)
    │                              │
    │                              └── VoiceVox (audio generation)
    │                                    │
    │    ←── JSON with audioUrl ────────┘
    │
    └─── Autoplay audio on card view
```
