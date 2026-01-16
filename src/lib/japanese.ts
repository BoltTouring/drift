/**
 * Japanese Language Utilities
 * 
 * Provides furigana parsing, reading detection, and Japanese-specific
 * text processing for the Drift app.
 */

import type { FuriganaSegment } from '@/types/snippet';

/**
 * Check if a character is a kanji
 */
export function isKanji(char: string): boolean {
  const code = char.charCodeAt(0);
  // CJK Unified Ideographs
  return (
    (code >= 0x4e00 && code <= 0x9faf) ||
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) // CJK Extension B
  );
}

/**
 * Check if a character is hiragana
 */
export function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x3040 && code <= 0x309f;
}

/**
 * Check if a character is katakana
 */
export function isKatakana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x30a0 && code <= 0x30ff;
}

/**
 * Check if a string contains kanji
 */
export function containsKanji(text: string): boolean {
  return Array.from(text).some(isKanji);
}

/**
 * Convert katakana to hiragana
 */
export function katakanaToHiragana(text: string): string {
  return Array.from(text)
    .map(char => {
      const code = char.charCodeAt(0);
      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60);
      }
      return char;
    })
    .join('');
}

/**
 * Convert hiragana to katakana
 */
export function hiraganaToKatakana(text: string): string {
  return Array.from(text)
    .map(char => {
      const code = char.charCodeAt(0);
      if (code >= 0x3041 && code <= 0x3096) {
        return String.fromCharCode(code + 0x60);
      }
      return char;
    })
    .join('');
}

/**
 * Simple tokenizer for Japanese text
 * Returns an array of segments (kanji words and non-kanji text)
 */
export function tokenizeJapanese(text: string): { text: string; isKanjiWord: boolean }[] {
  const segments: { text: string; isKanjiWord: boolean }[] = [];
  let currentSegment = '';
  let currentIsKanji = false;

  for (const char of text) {
    const charIsKanji = isKanji(char);

    if (currentSegment.length === 0) {
      currentSegment = char;
      currentIsKanji = charIsKanji;
    } else if (charIsKanji === currentIsKanji) {
      currentSegment += char;
    } else {
      segments.push({ text: currentSegment, isKanjiWord: currentIsKanji });
      currentSegment = char;
      currentIsKanji = charIsKanji;
    }
  }

  if (currentSegment.length > 0) {
    segments.push({ text: currentSegment, isKanjiWord: currentIsKanji });
  }

  return segments;
}

/**
 * Parse furigana from a text with ruby annotations
 * Format: 漢字[かんじ] or 漢字（かんじ）
 */
export function parseFurigana(text: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  
  // Match patterns like 漢字[かんじ] or 漢字（かんじ）
  const pattern = /([^\[\]（）]+)(?:\[([^\]]+)\]|（([^）]+)）)?/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const [, surface, bracketReading, parenReading] = match;
    const reading = bracketReading || parenReading || '';
    const hasKanji = containsKanji(surface);

    segments.push({
      surface,
      reading: reading || surface,
      isKanji: hasKanji && reading.length > 0,
    });
  }

  return segments;
}

/**
 * Create furigana segments from text and reading data
 * This is a simple implementation that creates one segment per character
 */
export function createFuriganaSegments(
  text: string,
  readingMap: Map<string, string>
): FuriganaSegment[] {
  const tokens = tokenizeJapanese(text);
  
  return tokens.map(token => {
    const reading = readingMap.get(token.text);
    return {
      surface: token.text,
      reading: reading || token.text,
      isKanji: token.isKanjiWord && !!reading,
    };
  });
}

/**
 * Render text with furigana as HTML
 */
export function renderFuriganaHtml(segments: FuriganaSegment[]): string {
  return segments
    .map(segment => {
      if (segment.isKanji) {
        return `<ruby>${segment.surface}<rp>(</rp><rt>${segment.reading}</rt><rp>)</rp></ruby>`;
      }
      return segment.surface;
    })
    .join('');
}

/**
 * Estimate difficulty of Japanese text (1-5)
 */
export function estimateJapaneseDifficulty(text: string): number {
  const chars = Array.from(text);
  const kanjiCount = chars.filter(isKanji).length;
  const katakanaCount = chars.filter(isKatakana).length;
  const totalChars = chars.length;

  if (totalChars === 0) return 1;

  const kanjiRatio = kanjiCount / totalChars;
  const katakanaRatio = katakanaCount / totalChars;

  // More kanji = harder
  // Pure hiragana = easier
  // Some katakana = usually loanwords, intermediate

  if (kanjiRatio < 0.1 && katakanaRatio < 0.3) {
    return 1; // Mostly hiragana, very easy
  }
  if (kanjiRatio < 0.2) {
    return 2; // Light kanji usage
  }
  if (kanjiRatio < 0.35) {
    return 3; // Normal mixed text
  }
  if (kanjiRatio < 0.5) {
    return 4; // Kanji-heavy
  }
  return 5; // Very kanji-heavy, formal/academic
}

/**
 * Common Japanese topic mappings for hashtag normalization
 */
export const JAPANESE_TOPICS: Record<string, string[]> = {
  'daily-life': ['日常', '生活', 'にちじょう', 'せいかつ'],
  'food': ['食べ物', '料理', 'グルメ', 'たべもの', 'りょうり'],
  'travel': ['旅行', '観光', 'りょこう', 'かんこう'],
  'work': ['仕事', 'ビジネス', 'しごと'],
  'anime': ['アニメ', '漫画', 'まんが', 'マンガ'],
  'music': ['音楽', 'おんがく', 'ミュージック'],
  'sports': ['スポーツ', '運動', 'うんどう'],
  'technology': ['技術', 'テクノロジー', 'ぎじゅつ', 'IT'],
  'nature': ['自然', 'しぜん', '自然'],
  'culture': ['文化', 'ぶんか', '伝統', 'でんとう'],
};

/**
 * Detect if text contains slang/internet language markers
 */
export function containsSlang(text: string): boolean {
  const slangMarkers = [
    'www', 'ｗｗｗ', '草', 'ワロタ', 'マジ', 'やばい', 'ヤバい',
    'それな', 'てか', 'なんか', 'めっちゃ', 'ガチ', 'ぴえん',
    '卍', 'エモい', 'バズる', 'ディスる', 'ググる',
  ];
  
  const lowerText = text.toLowerCase();
  return slangMarkers.some(marker => lowerText.includes(marker.toLowerCase()));
}

/**
 * Detect if text is likely formal Japanese
 */
export function isFormalJapanese(text: string): boolean {
  const formalEndings = [
    'ます', 'です', 'ございます', 'でございます',
    'いたします', 'させていただきます', 'おります',
  ];
  
  return formalEndings.some(ending => text.endsWith(ending));
}

/**
 * Word boundaries for Japanese (simplified)
 * Returns an array of potential word boundaries
 */
export function getWordBoundaries(text: string): number[] {
  const boundaries: number[] = [0];
  
  for (let i = 1; i < text.length; i++) {
    const prev = text[i - 1];
    const curr = text[i];
    
    // Transition between character types
    const prevIsKanji = isKanji(prev);
    const currIsKanji = isKanji(curr);
    const prevIsHiragana = isHiragana(prev);
    const currIsHiragana = isHiragana(curr);
    const prevIsKatakana = isKatakana(prev);
    const currIsKatakana = isKatakana(curr);
    
    // Boundary when switching between kanji and hiragana
    if (prevIsKanji && currIsHiragana) {
      boundaries.push(i);
    }
    // Boundary when switching from hiragana to kanji
    if (prevIsHiragana && currIsKanji) {
      boundaries.push(i);
    }
    // Boundary around katakana words
    if (prevIsKatakana !== currIsKatakana) {
      boundaries.push(i);
    }
  }
  
  boundaries.push(text.length);
  return boundaries;
}

/**
 * Get clickable word segments from Japanese text
 */
export function getClickableSegments(text: string): { start: number; end: number; text: string }[] {
  const boundaries = getWordBoundaries(text);
  const segments: { start: number; end: number; text: string }[] = [];
  
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const segmentText = text.slice(start, end).trim();
    
    if (segmentText.length > 0) {
      segments.push({ start, end, text: segmentText });
    }
  }
  
  return segments;
}
