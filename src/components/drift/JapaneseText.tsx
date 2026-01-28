/**
 * Japanese Text Component
 * 
 * Renders Japanese text with optional furigana and clickable words.
 */

import { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { tokenizeJapanese, containsKanji, isKanji, isHiragana, isKatakana } from '@/lib/japanese';

interface JapaneseTextProps {
  text: string;
  showFurigana: boolean;
  furiganaMode: 'off' | 'on' | 'unknown-only';
  unknownWordSet: Set<string>;
  onWordTap: (word: string) => void;
  furiganaData?: Map<string, string>; // word -> reading
}

export function JapaneseText({
  text,
  showFurigana,
  furiganaMode,
  unknownWordSet,
  onWordTap,
  furiganaData,
}: JapaneseTextProps) {
  // Tokenize and create clickable segments
  const segments = useMemo(() => {
    const tokens = tokenizeJapanese(text);
    
    return tokens.map((token, index) => {
      const hasKanjiChars = containsKanji(token.text);
      const isUnknown = unknownWordSet.has(token.text.toLowerCase()) || 
                        unknownWordSet.has(token.text);
      
      // Determine if we should show furigana for this token
      let displayFurigana = false;
      if (showFurigana && hasKanjiChars) {
        if (furiganaMode === 'on') {
          displayFurigana = true;
        } else if (furiganaMode === 'unknown-only' && isUnknown) {
          displayFurigana = true;
        }
      }

      // Get reading if available
      const reading = furiganaData?.get(token.text);

      return {
        id: index,
        text: token.text,
        isKanji: hasKanjiChars,
        isUnknown,
        displayFurigana: displayFurigana && !!reading,
        reading,
      };
    });
  }, [text, showFurigana, furiganaMode, unknownWordSet, furiganaData]);

  const handleClick = useCallback((word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onWordTap(word);
  }, [onWordTap]);

  return (
    <span className="inline">
      {segments.map((segment) => {
        const isClickable = segment.isKanji || segment.text.length > 1;

        if (segment.displayFurigana && segment.reading) {
          // Render with ruby annotation
          return (
            <ruby
              key={segment.id}
              onClick={(e) => handleClick(segment.text, e)}
              className={cn(
                "cursor-pointer transition-colors",
                "hover:bg-primary/20 hover:rounded",
                segment.isUnknown && "underline decoration-wavy decoration-yellow-500/50"
              )}
            >
              {segment.text}
              <rp>(</rp>
              <rt className="text-xs text-muted-foreground">{segment.reading}</rt>
              <rp>)</rp>
            </ruby>
          );
        }

        if (isClickable) {
          // Clickable span without furigana
          return (
            <span
              key={segment.id}
              onClick={(e) => handleClick(segment.text, e)}
              className={cn(
                "cursor-pointer transition-colors",
                "hover:bg-primary/20 hover:rounded px-0.5",
                segment.isUnknown && "underline decoration-wavy decoration-yellow-500/50"
              )}
            >
              {segment.text}
            </span>
          );
        }

        // Non-clickable text (single kana, punctuation, etc.)
        return <span key={segment.id}>{segment.text}</span>;
      })}
    </span>
  );
}

/**
 * Mock furigana data for common words
 * In a real implementation, this would come from a dictionary API
 */
export const MOCK_FURIGANA: Map<string, string> = new Map([
  ['今日', 'きょう'],
  ['天気', 'てんき'],
  ['良い', 'よい'],
  ['食べ', 'たべ'],
  ['飲み', 'のみ'],
  ['電車', 'でんしゃ'],
  ['遅れ', 'おくれ'],
  ['仕事', 'しごと'],
  ['勉強', 'べんきょう'],
  ['日本語', 'にほんご'],
  ['美味しい', 'おいしい'],
  ['楽しい', 'たのしい'],
  ['朝', 'あさ'],
  ['晩', 'ばん'],
  ['本', 'ほん'],
  ['読', 'よ'],
  ['書', 'か'],
  ['見', 'み'],
  ['聞', 'き'],
  ['話', 'はな'],
  ['行', 'い'],
  ['来', 'く'],
  ['帰', 'かえ'],
  ['買', 'か'],
  ['売', 'う'],
  ['待', 'ま'],
  ['会', 'あ'],
  ['知', 'し'],
  ['思', 'おも'],
  ['考', 'かんが'],
  ['分', 'わ'],
  ['言', 'い'],
  ['作', 'つく'],
  ['使', 'つか'],
  ['住', 'す'],
  ['働', 'はたら'],
  ['休', 'やす'],
  ['寝', 'ね'],
  ['起', 'お'],
  ['立', 'た'],
  ['座', 'すわ'],
  ['歩', 'ある'],
  ['走', 'はし'],
  ['泳', 'およ'],
  ['飛', 'と'],
  ['乗', 'の'],
  ['降', 'お'],
  ['入', 'はい'],
  ['出', 'で'],
  ['開', 'あ'],
  ['閉', 'し'],
  ['始', 'はじ'],
  ['終', 'お'],
  ['続', 'つづ'],
  ['変', 'か'],
  ['決', 'き'],
  ['選', 'えら'],
  ['集', 'あつ'],
  ['届', 'とど'],
  ['届け', 'とどけ'],
  ['送', 'おく'],
  ['届く', 'とどく'],
  ['届ける', 'とどける'],
  ['映画', 'えいが'],
  ['音楽', 'おんがく'],
  ['料理', 'りょうり'],
  ['旅行', 'りょこう'],
  ['写真', 'しゃしん'],
  ['運動', 'うんどう'],
  ['散歩', 'さんぽ'],
  ['買い物', 'かいもの'],
  ['会議', 'かいぎ'],
  ['予定', 'よてい'],
  ['約束', 'やくそく'],
  ['電話', 'でんわ'],
  ['手紙', 'てがみ'],
  ['新聞', 'しんぶん'],
  ['雑誌', 'ざっし'],
  ['季節', 'きせつ'],
  ['春', 'はる'],
  ['夏', 'なつ'],
  ['秋', 'あき'],
  ['冬', 'ふゆ'],
  ['空', 'そら'],
  ['海', 'うみ'],
  ['山', 'やま'],
  ['川', 'かわ'],
  ['花', 'はな'],
  ['木', 'き'],
  ['草', 'くさ'],
  ['鳥', 'とり'],
  ['魚', 'さかな'],
  ['犬', 'いぬ'],
  ['猫', 'ねこ'],
  ['家', 'いえ'],
  ['部屋', 'へや'],
  ['窓', 'まど'],
  ['机', 'つくえ'],
  ['椅子', 'いす'],
  ['時間', 'じかん'],
  ['場所', 'ばしょ'],
  ['方法', 'ほうほう'],
  ['問題', 'もんだい'],
  ['答え', 'こたえ'],
  ['質問', 'しつもん'],
  ['説明', 'せつめい'],
  ['理解', 'りかい'],
  ['練習', 'れんしゅう'],
  ['経験', 'けいけん'],
  ['成功', 'せいこう'],
  ['失敗', 'しっぱい'],
  ['努力', 'どりょく'],
  ['挑戦', 'ちょうせん'],
]);
