/**
 * PPQ.ai Feed API Endpoint
 * Server-side only
 */

type PPQFeedItem = {
  id: string;
  jp: string;
  en: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  mediaPrompt?: string;
};

// In-memory cache (resets on cold start)
let cachedFeed: PPQFeedItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function generateFeed(): Promise<PPQFeedItem[]> {
  const apiKey = process.env.PPQ_API_KEY;
  if (!apiKey) {
    throw new Error('PPQ_API_KEY not set');
  }

  const response = await fetch('https://api.ppq.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'auto',
      messages: [
        {
          role: 'user',
          content: `
Return ONLY valid JSON.

Generate exactly 5 Japanese language-learning items.

Format:
{
  "items": [
    {
      "id": "uuid",
      "jp": "Japanese sentence",
      "en": "English translation",
      "level": "N5 | N4 | N3 | N2",
      "mediaPrompt": "optional image description"
    }
  ]
}
          `.trim(),
        },
      ],
      temperature: 0.5,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    throw new Error(`PPQ error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('No content returned from PPQ');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Model did not return valid JSON');
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error('Missing items array');
  }

  return parsed.items.slice(0, 5).map((item, i) => ({
    id: item.id || `ppq-${Date.now()}-${i}`,
    jp: item.jp,
    en: item.en,
    level: item.level || 'N5',
    mediaPrompt: item.mediaPrompt,
  }));
}

/**
 * Vercel / Shakespeare-compatible handler
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const now = Date.now();
    if (cachedFeed && now - cacheTimestamp < CACHE_TTL) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).json({ items: cachedFeed });
      return;
    }

    const feed = await generateFeed();
    cachedFeed = feed;
    cacheTimestamp = now;

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json({ items: feed });
  } catch (err: any) {
    res.status(500).json({
      error: 'Feed generation failed',
      message: err?.message ?? 'Unknown error',
    });
  }
}