/**
 * Nostr-specific types for Drift
 * 
 * Custom event kind: 38859 (Addressable)
 * This kind is used for Drift snippet events.
 */

import type { NostrEvent } from '@nostrify/nostrify';
import type { Snippet, LengthClass, DifficultyLevel, SafetyFlags, LanguageCode } from './snippet';

/** Drift Snippet Event Kind (Addressable) */
export const DRIFT_SNIPPET_KIND = 38859;

/**
 * Tags for a Drift snippet event
 * 
 * Required tags:
 * - d: Unique identifier for the snippet (UUID)
 * - L: Label namespace "drift"
 * - l: Language label (e.g., "ja")
 * - alt: Human-readable description for NIP-31
 * 
 * Optional tags:
 * - t: Topic tags (multiple allowed)
 * - dialect: Dialect tag
 * - length: Length class (word/phrase/sentence/paragraph)
 * - difficulty: Difficulty level (1-5)
 * - content-warning: For sensitive content (NIP-36)
 * - e: Reference to original Nostr event (if clipped from Nostr)
 * - p: Reference to original author (if clipped from Nostr)
 * - ai-generated: Present if AI-generated
 * - translation: Translation text
 */
export interface DriftSnippetTags {
  d: string; // Unique identifier
  L: 'drift'; // Label namespace
  l: string; // Language code
  alt: string; // Human-readable description
  t?: string[]; // Topic tags
  dialect?: string;
  length?: LengthClass;
  difficulty?: string; // Stringified number
  'content-warning'?: string;
  e?: string; // Original event reference
  p?: string; // Original author pubkey
  'ai-generated'?: 'true';
  translation?: string;
}

/**
 * Convert a Drift Snippet to a Nostr event template
 */
export function snippetToEventTemplate(
  snippet: Snippet,
  pubkey: string
): Omit<NostrEvent, 'id' | 'sig'> {
  const tags: string[][] = [
    ['d', snippet.id],
    ['L', 'drift'],
    ['l', snippet.language, 'drift'],
    ['alt', `Drift language learning snippet: "${snippet.text.substring(0, 50)}${snippet.text.length > 50 ? '...' : ''}"`],
    ['length', snippet.lengthClass],
    ['difficulty', String(snippet.difficultyEstimate)],
  ];

  // Add topic tags
  for (const topic of snippet.topicTags) {
    tags.push(['t', topic]);
  }

  // Add dialect if present
  if (snippet.dialectTag) {
    tags.push(['dialect', snippet.dialectTag]);
  }

  // Add content warning if sensitive
  if (snippet.safetyFlags.sensitive || snippet.safetyFlags.profanity || snippet.safetyFlags.adult) {
    const warnings: string[] = [];
    if (snippet.safetyFlags.sensitive) warnings.push('sensitive');
    if (snippet.safetyFlags.profanity) warnings.push('profanity');
    if (snippet.safetyFlags.adult) warnings.push('adult');
    tags.push(['content-warning', warnings.join(', ')]);
  }

  // Add source references
  if (snippet.source.nostrOriginalEventId) {
    tags.push(['e', snippet.source.nostrOriginalEventId]);
  }
  if (snippet.source.originalAuthorPubkey) {
    tags.push(['p', snippet.source.originalAuthorPubkey]);
  }

  // Add AI-generated marker
  if (snippet.source.isAiGenerated) {
    tags.push(['ai-generated', 'true']);
  }

  // Add translation if present
  if (snippet.translation) {
    tags.push(['translation', snippet.translation]);
  }

  return {
    kind: DRIFT_SNIPPET_KIND,
    pubkey,
    created_at: snippet.createdAt,
    tags,
    content: snippet.text,
  };
}

/**
 * Parse a Nostr event into a Drift Snippet
 */
export function eventToSnippet(event: NostrEvent): Snippet | null {
  if (event.kind !== DRIFT_SNIPPET_KIND) {
    return null;
  }

  const getTag = (name: string): string | undefined => {
    const tag = event.tags.find(([n]) => n === name);
    return tag?.[1];
  };

  const getTags = (name: string): string[] => {
    return event.tags
      .filter(([n]) => n === name)
      .map(([, value]) => value)
      .filter(Boolean);
  };

  const dTag = getTag('d');
  if (!dTag) {
    return null;
  }

  const language = (getTag('l') || 'ja') as LanguageCode;
  const lengthClass = (getTag('length') || 'sentence') as LengthClass;
  const difficultyStr = getTag('difficulty');
  const difficulty = difficultyStr ? Math.min(5, Math.max(1, parseInt(difficultyStr))) as DifficultyLevel : 3;
  const topicTags = getTags('t');
  const dialectTag = getTag('dialect');
  const translation = getTag('translation');
  const contentWarning = getTag('content-warning');
  const aiGenerated = getTag('ai-generated') === 'true';
  const originalEventId = getTag('e');
  const originalAuthorPubkey = getTag('p');

  const safetyFlags: SafetyFlags = {
    sensitive: contentWarning?.includes('sensitive') ?? false,
    profanity: contentWarning?.includes('profanity') ?? false,
    adult: contentWarning?.includes('adult') ?? false,
  };

  return {
    id: dTag,
    text: event.content,
    language,
    dialectTag,
    topicTags,
    lengthClass,
    difficultyEstimate: difficulty,
    source: {
      nostrOriginalEventId: originalEventId,
      curatorPubkey: event.pubkey,
      originalAuthorPubkey,
      isAiGenerated: aiGenerated,
    },
    createdAt: event.created_at,
    safetyFlags,
    popularity: {
      likes: 0,
      dislikes: 0,
      saves: 0,
      zaps: 0,
      zapAmount: 0,
    },
    translation,
  };
}

/**
 * Validate a Drift snippet event
 */
export function validateDriftSnippetEvent(event: NostrEvent): boolean {
  if (event.kind !== DRIFT_SNIPPET_KIND) {
    return false;
  }

  // Must have d tag
  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  if (!dTag) {
    return false;
  }

  // Must have content
  if (!event.content || event.content.trim().length === 0) {
    return false;
  }

  // Must have L tag with 'drift' namespace
  const lNamespace = event.tags.find(([name]) => name === 'L')?.[1];
  if (lNamespace !== 'drift') {
    return false;
  }

  return true;
}

/**
 * Convert a kind 1 (text note) event to a snippet
 * Used when clipping content from regular Nostr posts
 */
export function textNoteToSnippet(
  event: NostrEvent,
  options: {
    selectedText?: string;
    language: LanguageCode;
    dialectTag?: string;
    topicTags?: string[];
    lengthClass?: LengthClass;
    difficultyEstimate?: DifficultyLevel;
    safetyFlags?: SafetyFlags;
  }
): Snippet {
  const text = options.selectedText || event.content;
  
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    language: options.language,
    dialectTag: options.dialectTag,
    topicTags: options.topicTags || [],
    lengthClass: options.lengthClass || estimateLengthClass(text),
    difficultyEstimate: options.difficultyEstimate || 3,
    source: {
      nostrOriginalEventId: event.id,
      originalAuthorPubkey: event.pubkey,
      isAiGenerated: false,
    },
    createdAt: Math.floor(Date.now() / 1000),
    safetyFlags: options.safetyFlags || {
      sensitive: false,
      profanity: false,
      adult: false,
    },
    popularity: {
      likes: 0,
      dislikes: 0,
      saves: 0,
      zaps: 0,
      zapAmount: 0,
    },
  };
}

/**
 * Estimate the length class of a text
 */
function estimateLengthClass(text: string): LengthClass {
  const trimmed = text.trim();
  
  // Count sentences (rough estimation)
  const sentences = trimmed.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
  
  // Count words/characters
  const charCount = trimmed.length;
  
  if (sentences.length >= 2) {
    return 'paragraph';
  }
  
  if (charCount > 50 || sentences.length === 1) {
    return 'sentence';
  }
  
  if (charCount > 15) {
    return 'phrase';
  }
  
  return 'word';
}
