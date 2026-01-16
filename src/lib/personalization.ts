/**
 * Drift Personalization Engine
 * 
 * Computes local preference profiles from user signals.
 * All computation is done locally for privacy.
 */

import type {
  Snippet,
  SnippetInteraction,
  PersonalizationProfile,
  TopicWeight,
  LengthClass,
  DifficultyLevel,
} from '@/types/snippet';
import {
  InteractionStorage,
  PersonalizationStorage,
  SnippetStorage,
} from './storage';

/** Scoring weights for different signals */
const SIGNAL_WEIGHTS = {
  like: 1.0,
  dislike: -1.5,
  save: 1.5,
  zap: 2.0,
  meaningReveal: 0.3,
  wordTap: 0.2,
  skip: -0.8,
  dwell: 0.5, // Per 10 seconds of dwell time
};

/** Decay factor for old interactions (per day) */
const DECAY_FACTOR = 0.95;

/** Minimum interactions before using personalization */
const MIN_INTERACTIONS_FOR_PERSONALIZATION = 5;

/**
 * Compute a score for an interaction
 */
function computeInteractionScore(interaction: SnippetInteraction): number {
  let score = 0;

  if (interaction.liked) score += SIGNAL_WEIGHTS.like;
  if (interaction.disliked) score += SIGNAL_WEIGHTS.dislike;
  if (interaction.saved) score += SIGNAL_WEIGHTS.save;
  if (interaction.zappedAmount && interaction.zappedAmount > 0) {
    score += SIGNAL_WEIGHTS.zap * Math.log10(interaction.zappedAmount + 1);
  }
  if (interaction.meaningRevealed) score += SIGNAL_WEIGHTS.meaningReveal;
  if (interaction.wordsTapped.length > 0) {
    score += SIGNAL_WEIGHTS.wordTap * Math.min(interaction.wordsTapped.length, 5);
  }
  if (interaction.wasSkip) score += SIGNAL_WEIGHTS.skip;

  // Dwell time bonus (capped at 60 seconds)
  const dwellSeconds = Math.min(interaction.dwellTime / 1000, 60);
  score += SIGNAL_WEIGHTS.dwell * (dwellSeconds / 10);

  return score;
}

/**
 * Apply time decay to a score based on interaction age
 */
function applyTimeDecay(score: number, viewedAt: number): number {
  const now = Date.now();
  const daysSinceViewed = (now - viewedAt) / (1000 * 60 * 60 * 24);
  return score * Math.pow(DECAY_FACTOR, daysSinceViewed);
}

/**
 * Aggregate topic scores from interactions
 */
async function computeTopicWeights(): Promise<TopicWeight[]> {
  const interactions = await InteractionStorage.getAll();
  const topicScores: Map<string, { totalScore: number; count: number }> = new Map();

  for (const interaction of interactions) {
    const snippet = await SnippetStorage.get(interaction.snippetId);
    if (!snippet) continue;

    const score = computeInteractionScore(interaction);
    const decayedScore = applyTimeDecay(score, interaction.viewedAt);

    for (const topic of snippet.topicTags) {
      const existing = topicScores.get(topic) || { totalScore: 0, count: 0 };
      existing.totalScore += decayedScore;
      existing.count += 1;
      topicScores.set(topic, existing);
    }
  }

  // Convert to weights (normalized to -1 to 1)
  const weights: TopicWeight[] = [];
  const maxAbsScore = Math.max(
    1,
    ...Array.from(topicScores.values()).map(v => Math.abs(v.totalScore))
  );

  for (const [topic, { totalScore, count }] of topicScores.entries()) {
    weights.push({
      topic,
      weight: Math.max(-1, Math.min(1, totalScore / maxAbsScore)),
      interactionCount: count,
    });
  }

  return weights.sort((a, b) => b.weight - a.weight);
}

/**
 * Compute dialect preference weights
 */
async function computeDialectWeights(): Promise<{ dialect: string; weight: number }[]> {
  const interactions = await InteractionStorage.getAll();
  const dialectScores: Map<string, number> = new Map();

  for (const interaction of interactions) {
    const snippet = await SnippetStorage.get(interaction.snippetId);
    if (!snippet || !snippet.dialectTag) continue;

    const score = computeInteractionScore(interaction);
    const decayedScore = applyTimeDecay(score, interaction.viewedAt);

    const existing = dialectScores.get(snippet.dialectTag) || 0;
    dialectScores.set(snippet.dialectTag, existing + decayedScore);
  }

  const maxAbsScore = Math.max(1, ...Array.from(dialectScores.values()).map(Math.abs));

  return Array.from(dialectScores.entries())
    .map(([dialect, score]) => ({
      dialect,
      weight: Math.max(-1, Math.min(1, score / maxAbsScore)),
    }))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Compute preferred length class
 */
async function computePreferredLength(): Promise<LengthClass> {
  const interactions = await InteractionStorage.getAll();
  const lengthScores: Map<LengthClass, number> = new Map();

  for (const interaction of interactions) {
    const snippet = await SnippetStorage.get(interaction.snippetId);
    if (!snippet) continue;

    const score = computeInteractionScore(interaction);
    if (score > 0) {
      const existing = lengthScores.get(snippet.lengthClass) || 0;
      lengthScores.set(snippet.lengthClass, existing + score);
    }
  }

  // Find the length with highest positive score
  let maxScore = 0;
  let preferred: LengthClass = 'sentence';

  for (const [length, score] of lengthScores.entries()) {
    if (score > maxScore) {
      maxScore = score;
      preferred = length;
    }
  }

  return preferred;
}

/**
 * Compute preferred difficulty range
 */
async function computePreferredDifficulty(): Promise<{
  min: DifficultyLevel;
  max: DifficultyLevel;
}> {
  const interactions = await InteractionStorage.getAll();
  const difficultyScores: Map<DifficultyLevel, number> = new Map();

  for (const interaction of interactions) {
    const snippet = await SnippetStorage.get(interaction.snippetId);
    if (!snippet) continue;

    const score = computeInteractionScore(interaction);
    if (score > 0) {
      const existing = difficultyScores.get(snippet.difficultyEstimate) || 0;
      difficultyScores.set(snippet.difficultyEstimate, existing + score);
    }
  }

  // Find the sweet spot
  const levels: DifficultyLevel[] = [1, 2, 3, 4, 5];
  let maxScore = 0;
  let preferredLevel: DifficultyLevel = 3;

  for (const level of levels) {
    const score = difficultyScores.get(level) || 0;
    if (score > maxScore) {
      maxScore = score;
      preferredLevel = level;
    }
  }

  // Create a range around the preferred level
  const min = Math.max(1, preferredLevel - 1) as DifficultyLevel;
  const max = Math.min(5, preferredLevel + 1) as DifficultyLevel;

  return { min, max };
}

/**
 * Rebuild the entire personalization profile
 */
export async function rebuildPersonalizationProfile(): Promise<PersonalizationProfile> {
  const [topicWeights, dialectWeights, preferredLength, preferredDifficulty] =
    await Promise.all([
      computeTopicWeights(),
      computeDialectWeights(),
      computePreferredLength(),
      computePreferredDifficulty(),
    ]);

  const profile: PersonalizationProfile = {
    topicWeights,
    dialectWeights,
    preferredLength,
    preferredDifficultyMin: preferredDifficulty.min,
    preferredDifficultyMax: preferredDifficulty.max,
    updatedAt: Date.now(),
  };

  await PersonalizationStorage.save(profile);
  return profile;
}

/**
 * Compute a personalized score for a snippet
 */
export async function computeSnippetScore(snippet: Snippet): Promise<number> {
  const profile = await PersonalizationStorage.get();
  const interactions = await InteractionStorage.getAll();

  // Check if we have enough interactions for personalization
  if (interactions.length < MIN_INTERACTIONS_FOR_PERSONALIZATION) {
    // Use global popularity only
    return computeGlobalScore(snippet);
  }

  let score = 0;

  // Global popularity component
  score += computeGlobalScore(snippet) * 0.3;

  // Topic affinity component
  for (const topic of snippet.topicTags) {
    const topicWeight = profile.topicWeights.find(tw => tw.topic === topic);
    if (topicWeight) {
      score += topicWeight.weight * 2;
    }
  }

  // Dialect affinity component
  if (snippet.dialectTag) {
    const dialectWeight = profile.dialectWeights.find(dw => dw.dialect === snippet.dialectTag);
    if (dialectWeight) {
      score += dialectWeight.weight * 1.5;
    }
  }

  // Length preference component
  if (snippet.lengthClass === profile.preferredLength) {
    score += 1;
  }

  // Difficulty preference component
  if (
    snippet.difficultyEstimate >= profile.preferredDifficultyMin &&
    snippet.difficultyEstimate <= profile.preferredDifficultyMax
  ) {
    score += 1;
  } else {
    // Penalize content outside difficulty range
    const distance = Math.min(
      Math.abs(snippet.difficultyEstimate - profile.preferredDifficultyMin),
      Math.abs(snippet.difficultyEstimate - profile.preferredDifficultyMax)
    );
    score -= distance * 0.5;
  }

  // Repetition penalty
  const existingInteraction = await InteractionStorage.get(snippet.id);
  if (existingInteraction) {
    // Already seen - heavy penalty
    score -= 5;
  }

  // Freshness boost
  const ageInDays = (Date.now() / 1000 - snippet.createdAt) / (60 * 60 * 24);
  if (ageInDays < 1) {
    score += 1; // Boost for very fresh content
  } else if (ageInDays < 7) {
    score += 0.5;
  }

  return score;
}

/**
 * Compute global popularity score based on counters
 */
function computeGlobalScore(snippet: Snippet): number {
  const { likes, dislikes, saves, zaps, zapAmount } = snippet.popularity;

  let score = 0;
  score += likes * 0.1;
  score -= dislikes * 0.15;
  score += saves * 0.2;
  score += zaps * 0.3;
  score += Math.log10(zapAmount + 1) * 0.2;

  return score;
}

/**
 * Rank a list of snippets by personalized score
 */
export async function rankSnippets(snippets: Snippet[]): Promise<Snippet[]> {
  const scoredSnippets = await Promise.all(
    snippets.map(async snippet => ({
      snippet,
      score: await computeSnippetScore(snippet),
    }))
  );

  scoredSnippets.sort((a, b) => b.score - a.score);

  return scoredSnippets.map(s => s.snippet);
}

/**
 * Get snippets that contain a good number of unknown words
 * (Comprehensible input: mostly known with a few unknowns)
 */
export async function filterForComprehensibleInput(
  snippets: Snippet[],
  unknownWords: Set<string>,
  maxUnknownRatio = 0.2
): Promise<Snippet[]> {
  return snippets.filter(snippet => {
    // Simple word tokenization
    const words = snippet.text.split(/\s+/);
    if (words.length === 0) return true;

    let unknownCount = 0;
    for (const word of words) {
      if (unknownWords.has(word.toLowerCase())) {
        unknownCount++;
      }
    }

    const unknownRatio = unknownCount / words.length;

    // Accept if:
    // 1. Less than maxUnknownRatio unknowns (mostly comprehensible)
    // 2. Has at least 1 unknown (learning opportunity)
    return unknownRatio <= maxUnknownRatio && unknownCount >= 1;
  });
}
