/**
 * Drift Snippet Generator
 * 
 * AI-powered snippet generation for keeping the feed full.
 * This is a stub implementation that can be connected to a model endpoint later.
 */

import type {
  Snippet,
  LanguageCode,
  LengthClass,
  DifficultyLevel,
  SafetyFlags,
} from '@/types/snippet';
import { estimateJapaneseDifficulty, containsSlang, isFormalJapanese } from './japanese';

/** Options for generating snippets */
export interface GenerationOptions {
  language: LanguageCode;
  lengthClass: LengthClass;
  dialect?: string;
  topic?: string;
  difficulty?: DifficultyLevel;
  allowSensitive?: boolean;
}

/** Sample snippets for different languages (fallback data) */
const SAMPLE_SNIPPETS: Record<string, { text: string; topics: string[]; dialect?: string }[]> = {
  ja: [
    // Daily life - Standard Japanese
    { text: '今日は天気がいいですね。', topics: ['daily-life', 'weather'], dialect: '標準語' },
    { text: '朝ごはんを食べましたか？', topics: ['daily-life', 'food'], dialect: '標準語' },
    { text: '電車が遅れています。', topics: ['daily-life', 'transport'], dialect: '標準語' },
    { text: 'コーヒーを飲みながら本を読んでいます。', topics: ['daily-life', 'leisure'], dialect: '標準語' },
    { text: '来週の予定を確認しましょう。', topics: ['work', 'planning'], dialect: '標準語' },
    
    // Casual conversation
    { text: 'えー、マジで？信じられない！', topics: ['casual', 'surprise'], dialect: '標準語' },
    { text: 'ちょっと待って、今行くから。', topics: ['casual', 'daily-life'], dialect: '標準語' },
    { text: 'なんか最近疲れてるんだよね。', topics: ['casual', 'feelings'], dialect: '標準語' },
    { text: 'この映画、めっちゃ面白かった！', topics: ['entertainment', 'movies'], dialect: '標準語' },
    { text: 'あとで連絡するね。', topics: ['casual', 'communication'], dialect: '標準語' },
    
    // Formal
    { text: 'お忙しいところ恐れ入りますが、ご確認いただけますでしょうか。', topics: ['formal', 'work'], dialect: '標準語' },
    { text: '本日はお越しいただき、誠にありがとうございます。', topics: ['formal', 'greeting'], dialect: '標準語' },
    { text: 'ご不明な点がございましたら、お気軽にお問い合わせください。', topics: ['formal', 'customer-service'], dialect: '標準語' },
    
    // Slang/Internet
    { text: '草生えるwww', topics: ['slang', 'internet'], dialect: '標準語' },
    { text: 'それな〜わかりみが深い。', topics: ['slang', 'casual'], dialect: '標準語' },
    { text: 'ぴえん🥺 今日もバイト長かった。', topics: ['slang', 'work'], dialect: '標準語' },
    
    // Kansai dialect
    { text: 'なんでやねん！そんなん知らんわ。', topics: ['casual', 'surprise'], dialect: '関西弁' },
    { text: 'めっちゃうまいやん、これ！', topics: ['food', 'casual'], dialect: '関西弁' },
    { text: 'ほんまに？ありえへんわ。', topics: ['casual', 'surprise'], dialect: '関西弁' },
    { text: 'ちゃう、ちゃう、そうちゃうって。', topics: ['casual', 'denial'], dialect: '関西弁' },
    
    // Hakata dialect
    { text: 'なんしよーと？今日暇やけん遊ばん？', topics: ['casual', 'invitation'], dialect: '博多弁' },
    { text: 'ばりすごかったっちゃん！', topics: ['casual', 'excitement'], dialect: '博多弁' },
    { text: 'よかよ、大丈夫ばい。', topics: ['casual', 'reassurance'], dialect: '博多弁' },
    
    // Food
    { text: 'このラーメン、スープが濃厚で美味しいです。', topics: ['food', 'restaurants'], dialect: '標準語' },
    { text: '寿司は新鮮なネタが命だと思います。', topics: ['food', 'sushi'], dialect: '標準語' },
    { text: '母の手料理が一番好きです。', topics: ['food', 'family'], dialect: '標準語' },
    
    // Travel
    { text: '京都の紅葉はとても綺麗でした。', topics: ['travel', 'nature'], dialect: '標準語' },
    { text: '富士山を見るのが夢です。', topics: ['travel', 'dreams'], dialect: '標準語' },
    { text: '温泉でゆっくりしたいな。', topics: ['travel', 'relaxation'], dialect: '標準語' },
    
    // Technology
    { text: 'このアプリ、使いやすくていいですね。', topics: ['technology', 'apps'], dialect: '標準語' },
    { text: 'AIの進化がすごいですね。', topics: ['technology', 'ai'], dialect: '標準語' },
    { text: 'スマホの充電が切れそう。', topics: ['technology', 'daily-life'], dialect: '標準語' },
    
    // Culture
    { text: '花見の季節が楽しみです。', topics: ['culture', 'seasons'], dialect: '標準語' },
    { text: '神社でお参りをしてきました。', topics: ['culture', 'religion'], dialect: '標準語' },
    { text: '着物を着る機会が少なくなりましたね。', topics: ['culture', 'tradition'], dialect: '標準語' },
    
    // Longer sentences (paragraph)
    { 
      text: '日本の四季は美しいです。春は桜が咲き、夏は海に行き、秋は紅葉を楽しみ、冬は雪を見ます。', 
      topics: ['nature', 'seasons', 'culture'], 
      dialect: '標準語' 
    },
    { 
      text: '最近、在宅勤務が増えました。通勤時間がなくなって楽ですが、同僚と話す機会が減って少し寂しいです。', 
      topics: ['work', 'lifestyle', 'feelings'], 
      dialect: '標準語' 
    },
  ],
  
  en: [
    { text: 'The weather is nice today.', topics: ['daily-life', 'weather'] },
    { text: 'Have you had breakfast yet?', topics: ['daily-life', 'food'] },
    { text: 'I love reading books on rainy days.', topics: ['hobbies', 'weather'] },
    { text: 'What are your plans for the weekend?', topics: ['casual', 'planning'] },
    { text: 'This coffee shop has the best lattes.', topics: ['food', 'recommendations'] },
  ],
  
  es: [
    { text: '¿Qué tal estás hoy?', topics: ['greeting', 'casual'] },
    { text: 'Me encanta la comida mexicana.', topics: ['food', 'preferences'] },
    { text: 'El verano es mi estación favorita.', topics: ['seasons', 'preferences'] },
    { text: '¿Puedes ayudarme con esto?', topics: ['request', 'casual'] },
    { text: 'Vamos a la playa este fin de semana.', topics: ['travel', 'plans'] },
  ],
  
  fr: [
    { text: 'Comment allez-vous aujourd\'hui?', topics: ['greeting', 'formal'] },
    { text: 'J\'adore le pain français.', topics: ['food', 'preferences'] },
    { text: 'Paris est une ville magnifique.', topics: ['travel', 'cities'] },
    { text: 'Il fait beau aujourd\'hui.', topics: ['weather', 'daily-life'] },
    { text: 'Je voudrais un café, s\'il vous plaît.', topics: ['food', 'ordering'] },
  ],
  
  de: [
    { text: 'Wie geht es Ihnen?', topics: ['greeting', 'formal'] },
    { text: 'Ich liebe deutsches Bier.', topics: ['food', 'drinks'] },
    { text: 'Das Wetter ist heute schön.', topics: ['weather', 'daily-life'] },
    { text: 'Können Sie mir helfen?', topics: ['request', 'formal'] },
    { text: 'Ich lerne seit zwei Jahren Deutsch.', topics: ['learning', 'language'] },
  ],
  
  ko: [
    { text: '오늘 날씨가 좋네요.', topics: ['weather', 'daily-life'] },
    { text: '한국 음식을 좋아해요.', topics: ['food', 'preferences'] },
    { text: '주말에 뭐 할 거예요?', topics: ['casual', 'planning'] },
    { text: '이 카페 분위기가 좋아요.', topics: ['food', 'places'] },
    { text: '한국어 공부 열심히 하고 있어요.', topics: ['learning', 'language'] },
  ],
  
  zh: [
    { text: '今天天气很好。', topics: ['weather', 'daily-life'] },
    { text: '我喜欢吃中国菜。', topics: ['food', 'preferences'] },
    { text: '你周末有什么计划？', topics: ['casual', 'planning'] },
    { text: '学习中文很有意思。', topics: ['learning', 'language'] },
    { text: '这个地方真漂亮。', topics: ['travel', 'places'] },
  ],
};

/**
 * Generate snippets using AI (stub implementation)
 * 
 * In a real implementation, this would call an AI API endpoint.
 * For now, it returns sample snippets from the fallback data.
 */
export async function generateSnippets(
  options: GenerationOptions,
  count: number = 5
): Promise<Snippet[]> {
  const { language, lengthClass, dialect, topic, difficulty, allowSensitive } = options;
  
  // Get samples for the language (fallback to Japanese if not found)
  const samples = SAMPLE_SNIPPETS[language] || SAMPLE_SNIPPETS['ja'];
  
  // Filter by dialect if specified
  let filtered = samples;
  if (dialect && language === 'ja') {
    filtered = samples.filter(s => !s.dialect || s.dialect === dialect);
    // If no matches, fall back to all samples
    if (filtered.length === 0) {
      filtered = samples;
    }
  }
  
  // Filter by topic if specified
  if (topic) {
    const topicFiltered = filtered.filter(s => s.topics.includes(topic));
    if (topicFiltered.length > 0) {
      filtered = topicFiltered;
    }
  }
  
  // Filter by length class
  filtered = filtered.filter(s => {
    const textLength = s.text.length;
    switch (lengthClass) {
      case 'word':
        return textLength < 10;
      case 'phrase':
        return textLength >= 10 && textLength < 30;
      case 'sentence':
        return textLength >= 10 && textLength < 80;
      case 'paragraph':
        return textLength >= 60;
      default:
        return true;
    }
  });
  
  // If not enough filtered, use all samples
  if (filtered.length < count) {
    filtered = samples;
  }
  
  // Shuffle and take requested count
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  
  // Convert to Snippet objects
  return selected.map((sample, index) => {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    // Estimate difficulty for Japanese
    let estimatedDifficulty: DifficultyLevel = difficulty || 3;
    if (language === 'ja') {
      estimatedDifficulty = estimateJapaneseDifficulty(sample.text) as DifficultyLevel;
    }
    
    // Detect content flags
    const hasSensitive = containsSlang(sample.text);
    const safetyFlags: SafetyFlags = {
      sensitive: hasSensitive,
      profanity: false,
      adult: false,
    };
    
    return {
      id,
      text: sample.text,
      language,
      dialectTag: sample.dialect || dialect,
      topicTags: sample.topics,
      lengthClass: estimateLengthClass(sample.text),
      difficultyEstimate: estimatedDifficulty,
      source: {
        isAiGenerated: true,
        curatorPubkey: undefined,
        originalAuthorPubkey: undefined,
      },
      createdAt: now - index * 60, // Stagger creation times
      safetyFlags,
      popularity: {
        likes: Math.floor(Math.random() * 10),
        dislikes: Math.floor(Math.random() * 2),
        saves: Math.floor(Math.random() * 5),
        zaps: Math.floor(Math.random() * 3),
        zapAmount: Math.floor(Math.random() * 1000),
      },
    };
  });
}

/**
 * Estimate length class from text
 */
function estimateLengthClass(text: string): LengthClass {
  const length = text.length;
  if (length < 10) return 'word';
  if (length < 30) return 'phrase';
  if (length < 80) return 'sentence';
  return 'paragraph';
}

/**
 * AI Generation Interface
 * 
 * This interface defines what a real AI generation backend would implement.
 * It can be replaced with actual API calls to services like OpenAI, Claude, etc.
 */
export interface AIGeneratorBackend {
  generateSnippet(options: GenerationOptions): Promise<string>;
  translateText(text: string, from: LanguageCode, to: LanguageCode): Promise<string>;
  getReading(text: string, language: LanguageCode): Promise<string>;
  getDefinition(word: string, language: LanguageCode, targetLanguage: LanguageCode): Promise<string>;
}

/**
 * Stub AI backend for development
 */
export const stubAIBackend: AIGeneratorBackend = {
  async generateSnippet(options: GenerationOptions): Promise<string> {
    const samples = SAMPLE_SNIPPETS[options.language] || SAMPLE_SNIPPETS['ja'];
    const random = samples[Math.floor(Math.random() * samples.length)];
    return random.text;
  },
  
  async translateText(text: string, _from: LanguageCode, _to: LanguageCode): Promise<string> {
    // Stub: Return a placeholder translation
    return `[Translation of: ${text}]`;
  },
  
  async getReading(text: string, _language: LanguageCode): Promise<string> {
    // Stub: Return the text as-is
    return text;
  },
  
  async getDefinition(word: string, _language: LanguageCode, _targetLanguage: LanguageCode): Promise<string> {
    // Stub: Return a placeholder definition
    return `Definition of "${word}"`;
  },
};

/** Currently active AI backend */
let activeBackend: AIGeneratorBackend = stubAIBackend;

/**
 * Set the AI backend to use for generation
 */
export function setAIBackend(backend: AIGeneratorBackend): void {
  activeBackend = backend;
}

/**
 * Get the current AI backend
 */
export function getAIBackend(): AIGeneratorBackend {
  return activeBackend;
}
