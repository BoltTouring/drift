/**
 * Drift Snippet Card
 * 
 * Displays a single snippet with interactive elements.
 * Supports word tapping, meaning reveal, and microactions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ThumbsUp, ThumbsDown, Star, Zap, Eye, Bot, Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Snippet } from '@/types/snippet';
import { JapaneseText } from './JapaneseText';
import { generatePlaceholderGradient } from '@/lib/imageGenerator';
import { fetchGif, getMediaType } from '@/lib/mediaService';
import { useTTS } from '@/hooks/useTTS';

interface SnippetCardProps {
  snippet: Snippet;
  isActive: boolean;
  furiganaMode: 'off' | 'on' | 'unknown-only';
  unknownWordSet: Set<string>;
  interaction?: { liked?: boolean; disliked?: boolean; saved?: boolean };
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onZap: () => void;
  onWordTap: (word: string) => void;
  onMeaningReveal: () => void;
  dictionaryMode: 'L-L' | 'L-E';
  targetLanguage: string;
}

const MEANING_DELAY = 800; // ms before meaning button appears

export function SnippetCard({
  snippet,
  isActive,
  furiganaMode,
  unknownWordSet,
  interaction,
  onLike,
  onDislike,
  onSave,
  onZap,
  onWordTap,
  onMeaningReveal,
  dictionaryMode,
  targetLanguage,
}: SnippetCardProps) {
  const [showMeaningButton, setShowMeaningButton] = useState(false);
  const [meaningRevealed, setMeaningRevealed] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [kenBurnsVariant] = useState(() => Math.floor(Math.random() * 3) + 1);

  // TTS for audio playback - uses cached audioUrl if available, autoplay when active
  const { speak, stop, isPlaying, isLoading } = useTTS({
    language: targetLanguage === 'ja' ? 'ja-JP' : 'en-US',
    audioUrl: snippet.audioUrl,
    autoPlay: isActive, // Auto-play when this card becomes active
  });

  const handlePlayAudio = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      speak(snippet.text);
    }
  }, [isPlaying, stop, speak, snippet.text]);

  // Stop audio when navigating away
  useEffect(() => {
    if (!isActive && isPlaying) {
      stop();
    }
  }, [isActive, isPlaying, stop]);

  // Show meaning button after delay
  useEffect(() => {
    if (isActive) {
      setShowMeaningButton(false);
      setMeaningRevealed(false);

      const timer = setTimeout(() => {
        setShowMeaningButton(true);
      }, MEANING_DELAY);

      return () => clearTimeout(timer);
    }
  }, [isActive, snippet.id]);

  // Reset media state when snippet changes
  useEffect(() => {
    setMediaLoaded(false);
    setMediaError(false);
    setGifUrl(null);
  }, [snippet.id]);

  // Fetch GIF for this snippet
  useEffect(() => {
    // If snippet already has a mediaUrl, use it
    if (snippet.mediaUrl) {
      const img = new Image();
      img.onload = () => setMediaLoaded(true);
      img.onerror = () => setMediaError(true);
      img.src = snippet.mediaUrl;
      return;
    }

    // Otherwise, fetch a GIF
    console.log('[Media] Fetching GIF for:', snippet.text.substring(0, 30));
    fetchGif(snippet.text, snippet.mediaPrompt).then(url => {
      console.log('[Media] Got GIF URL:', url);
      if (url) {
        setGifUrl(url);
        // Preload the GIF
        const img = new Image();
        img.onload = () => setMediaLoaded(true);
        img.onerror = () => {
          console.warn('[Media] Failed to load GIF:', url);
          setMediaError(true);
        };
        img.src = url;
      }
    }).catch(err => {
      console.warn('[Media] GIF fetch error:', err);
    });
  }, [snippet.id, snippet.text, snippet.mediaPrompt, snippet.mediaUrl]);

  // Determine the media URL to use (GIF takes priority)
  const activeMediaUrl = gifUrl || snippet.mediaUrl;
  const mediaType = activeMediaUrl ? getMediaType(activeMediaUrl) : null;
  const isGif = mediaType === 'gif';

  // Ken Burns class for static images (not GIFs - they're already animated)
  const kenBurnsClass = !isGif && mediaLoaded
    ? kenBurnsVariant === 1 ? 'ken-burns'
    : kenBurnsVariant === 2 ? 'ken-burns-2'
    : 'ken-burns-3'
    : '';

  // Background style - GIF, image, or gradient fallback
  const backgroundStyle = useMemo(() => {
    if (activeMediaUrl && mediaLoaded && !mediaError) {
      return {
        backgroundImage: `url(${activeMediaUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (snippet.mediaPrompt) {
      return {
        background: generatePlaceholderGradient(snippet.mediaPrompt),
      };
    }
    return {};
  }, [activeMediaUrl, snippet.mediaPrompt, mediaLoaded, mediaError]);

  const handleMeaningReveal = useCallback(() => {
    setMeaningRevealed(!meaningRevealed);
    if (!meaningRevealed) {
      onMeaningReveal();
    }
  }, [meaningRevealed, onMeaningReveal]);

  const isJapanese = targetLanguage === 'ja' || snippet.language === 'ja';

  // Determine if we should show furigana
  const shouldShowFurigana = useMemo(() => {
    if (!isJapanese) return false;
    if (furiganaMode === 'off') return false;
    if (furiganaMode === 'on') return true;
    return furiganaMode === 'unknown-only';
  }, [isJapanese, furiganaMode]);

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {/* Animated background layer (Ken Burns for images, static for GIFs) */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          mediaLoaded ? "opacity-100" : "opacity-0",
          kenBurnsClass
        )}
        style={backgroundStyle}
      />

      {/* Gradient placeholder while loading */}
      {!mediaLoaded && snippet.mediaPrompt && (
        <div
          className="absolute inset-0"
          style={{ background: generatePlaceholderGradient(snippet.mediaPrompt) }}
        />
      )}

      {/* Floating particles for extra life */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${15 + i * 15}%`,
                animationDelay: `${i * 1.2}s`,
                animationDuration: `${6 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 pointer-events-none" />

      {/* Content container */}
      <div className="relative flex flex-col h-full w-full p-4 pt-12 z-10">
        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full">
            {/* Snippet text */}
            <div
              className={cn(
                "text-center transition-all duration-300 text-white drop-shadow-lg",
                isJapanese ? "text-3xl md:text-4xl leading-relaxed" : "text-2xl md:text-3xl leading-relaxed"
              )}
            >
            {isJapanese ? (
              <JapaneseText
                text={snippet.text}
                showFurigana={shouldShowFurigana}
                furiganaMode={furiganaMode}
                unknownWordSet={unknownWordSet}
                onWordTap={onWordTap}
              />
            ) : (
              <ClickableText
                text={snippet.text}
                onWordTap={onWordTap}
              />
            )}
          </div>

            {/* Translation/meaning panel */}
            <div
              className={cn(
                "mt-8 text-center transition-all duration-500 overflow-hidden",
                meaningRevealed ? "opacity-100 max-h-40" : "opacity-0 max-h-0"
              )}
            >
              {snippet.translation ? (
                <p className="text-lg text-white/80 drop-shadow">{snippet.translation}</p>
              ) : (
                <p className="text-lg text-white/60 italic drop-shadow">
                  {dictionaryMode === 'L-E'
                    ? '[Translation not available]'
                    : isJapanese
                      ? '[訳なし]'
                      : '[No translation]'}
                </p>
              )}
            </div>

            {/* Action buttons row */}
            <div className="mt-6 flex justify-center gap-3">
              {/* Audio playback button */}
              <Button
                variant="outline"
                size="lg"
                onClick={handlePlayAudio}
                disabled={isLoading}
                className={cn(
                  "transition-all duration-300 gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20",
                  showMeaningButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
                  isPlaying && "bg-white/20 border-white/50"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Volume2 className={cn("h-5 w-5", isPlaying && "text-blue-400")} />
                )}
                {isPlaying ? 'Stop' : 'Listen'}
              </Button>

              {/* Meaning reveal button */}
              <Button
                variant="outline"
                size="lg"
                onClick={handleMeaningReveal}
                className={cn(
                  "transition-all duration-300 gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20",
                  showMeaningButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                )}
              >
                <Eye className="h-5 w-5" />
                {meaningRevealed ? 'Hide' : 'Meaning'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom actions bar */}
        <div className="flex justify-center items-center gap-3 pb-6">
          {/* Dislike */}
          <ActionButton
            onClick={onDislike}
            active={interaction?.disliked}
            activeColor="text-red-400"
            icon={<ThumbsDown className="h-6 w-6" />}
            label="Dislike"
          />

          {/* Like */}
          <ActionButton
            onClick={onLike}
            active={interaction?.liked}
            activeColor="text-green-400"
            icon={<ThumbsUp className="h-6 w-6" />}
            label="Like"
          />

          {/* Save */}
          <ActionButton
            onClick={onSave}
            active={interaction?.saved}
            activeColor="text-yellow-400"
            icon={<Star className={cn("h-6 w-6", interaction?.saved && "fill-current")} />}
            label="Save"
          />

          {/* Zap */}
          <ActionButton
            onClick={onZap}
            activeColor="text-orange-400"
            icon={<Zap className="h-6 w-6" />}
            label="Zap"
          />
        </div>

        {/* Metadata bar */}
        <div className="absolute bottom-24 left-0 right-0 px-4">
          <div className="flex items-center justify-center gap-3 text-xs text-white/70">
            {snippet.dialectTag && (
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                {snippet.dialectTag}
              </span>
            )}
            {snippet.topicTags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                #{tag}
              </span>
            ))}
            {snippet.source.isAiGenerated && (
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-1">
                <Bot className="h-3 w-3" />
                AI
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  active?: boolean;
  activeColor: string;
  icon: React.ReactNode;
  label: string;
}

function ActionButton({ onClick, active, activeColor, icon, label }: ActionButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "p-3 rounded-full transition-all duration-200",
        "hover:bg-white/20 active:scale-95 backdrop-blur-sm",
        active ? activeColor : "text-white/70 hover:text-white"
      )}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

interface ClickableTextProps {
  text: string;
  onWordTap: (word: string) => void;
}

function ClickableText({ text, onWordTap }: ClickableTextProps) {
  // Split by spaces for non-Japanese text
  const words = text.split(/(\s+)/);

  return (
    <span>
      {words.map((word, index) => {
        if (/^\s+$/.test(word)) {
          return <span key={index}>{word}</span>;
        }

        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              // Remove punctuation for lookup
              const cleanWord = word.replace(/[.,!?;:"'()]/g, '');
              if (cleanWord.length > 0) {
                onWordTap(cleanWord);
              }
            }}
            className="cursor-pointer hover:bg-primary/20 hover:rounded px-0.5 transition-colors"
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}
