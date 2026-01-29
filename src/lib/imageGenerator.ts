/**
 * PPQ.ai Image Generator
 *
 * Generates images for snippets using the mediaPrompt field.
 * Uses PPQ.ai's DALL-E compatible image generation API.
 */

// Cache to avoid regenerating images
const imageCache = new Map<string, string>();

/**
 * Generate an image from a prompt using PPQ.ai
 * Returns a data URL or external URL for the image
 */
export async function generateImage(prompt: string): Promise<string | null> {
  // Check cache first
  const cacheKey = prompt.slice(0, 100);
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  const apiKey = import.meta.env.VITE_PPQ_API_KEY as string | undefined;

  if (!apiKey) {
    console.warn('[Drift] No API key for image generation');
    return null;
  }

  try {
    const response = await fetch('https://api.ppq.ai/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'flux-1.1-pro',
        prompt: `Anime style, vertical phone aspect ratio, vibrant colors: ${prompt}`,
        n: 1,
        size: '768x1344', // Vertical aspect ratio for phone
      }),
    });

    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url;

    if (imageUrl) {
      imageCache.set(cacheKey, imageUrl);
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.warn('[Drift] Image generation failed:', error);
    return null;
  }
}

/**
 * Generate a placeholder gradient based on the prompt
 * Used as fallback when image generation isn't available
 */
export function generatePlaceholderGradient(prompt: string): string {
  // Generate a consistent color based on the prompt
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;

  return `linear-gradient(135deg, hsl(${hue1}, 70%, 30%), hsl(${hue2}, 60%, 20%))`;
}

/**
 * Get a relevant Unsplash image URL based on keywords
 * Fallback when PPQ.ai image generation isn't available
 */
export function getUnsplashImage(prompt: string): string {
  // Extract keywords from the prompt
  const keywords = prompt
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(' ')
    .filter(word => word.length > 3)
    .slice(0, 3)
    .join(',');

  // Use Unsplash Source API (free, no key required)
  return `https://source.unsplash.com/768x1344/?${encodeURIComponent(keywords)}`;
}
