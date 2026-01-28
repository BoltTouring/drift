# 🌊 Drift - Language Immersion Feed

Drift is a TikTok-style language learning app that immerses you in short, swipeable content. Japanese-first excellence with graceful degradation for other languages.

## Features

### Core Experience
- **Vertical Swipe Feed**: Smooth, addictive swiping through bite-sized language content
- **Microactions**: Like 👍, Dislike 👎, Save ⭐, and Zap ⚡ snippets
- **Word Tapping**: Tap any word for instant meaning/reading lookup
- **Delayed Meaning Reveal**: 800ms delay before showing translation (reduces instant-translation addiction)

### Japanese Excellence
- **Furigana Support**: Show readings above kanji (configurable: off/on/unknown-only)
- **Dialect Tags**: Standard (標準語), Kansai (関西弁), Hakata (博多弁)
- **J-J or J-E Dictionary**: Choose monolingual or bilingual definitions

### Privacy-First Personalization
- All user signals stored locally in IndexedDB
- No tracking, no analytics, no behavior linked to identity by default
- Local preference profile built from:
  - Dwell time
  - Likes/dislikes
  - Saves
  - Word taps
  - Meaning reveals
  - Zaps

### Nostr Integration
- **Optional Login**: Browse without an account, or login with Nostr
- **Content Source**: Snippets fetched from Nostr relays
- **NIP-07**: Browser extension signer support
- **NIP-46**: Nostr bunker support
- **NIP-57**: Lightning zaps with split payments

### Zap Split Logic
When zapping a snippet:
- 45% to curator
- 45% to original author
- 10% to Drift platform

If a recipient lacks a Lightning wallet, their share is redistributed.

### Daily Drift Mode
- Set daily goals (5/10/15 snippets)
- Track progress with completion stats
- Build consistency without punitive streaks

### PWA Features
- Installable on mobile and desktop
- Offline caching of snippets
- Service worker with background sync

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd drift

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Configuration

### Relay Configuration

By default, Drift connects to these relays:
- `wss://relay.ditto.pub`
- `wss://relay.nostr.band`
- `wss://relay.damus.io`

Users can customize relays in Settings.

### Snippet Event Structure

Drift uses kind `38859` for addressable snippet events. See [NIP.md](./NIP.md) for full documentation.

Example snippet event:
```json
{
  "kind": 38859,
  "content": "今日は天気がいいですね。",
  "tags": [
    ["d", "unique-id"],
    ["L", "drift"],
    ["l", "ja", "drift"],
    ["alt", "Drift snippet: 今日は天気がいいですね。"],
    ["length", "sentence"],
    ["difficulty", "2"],
    ["t", "daily-life"],
    ["dialect", "標準語"]
  ]
}
```

## Settings

| Setting | Options | Default |
|---------|---------|---------|
| Target Language | ja, en, es, fr, de, zh, ko, pt, it, ru | ja |
| Dictionary Mode | L-L (monolingual), L-E (bilingual) | L-E |
| Furigana Display | Off, On, Unknown Only | Unknown Only |
| Max Snippet Length | word, phrase, sentence, paragraph | sentence |
| Hide Sensitive Content | On/Off | On |
| Daily Drift Target | 5, 10, 15 | 10 |
| Auto-advance | On/Off | Off |
| Offline Cache Size | 50, 100 snippets | 50 |
| Publish Reactions | On/Off | Off |

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast builds
- **TailwindCSS** with shadcn/ui components
- **Nostrify** for Nostr protocol
- **TanStack Query** for data fetching
- **IndexedDB** for local storage
- **PWA** with Workbox

## Project Structure

```
src/
├── components/
│   ├── drift/          # Drift-specific components
│   │   ├── SwipeFeed.tsx
│   │   ├── SnippetCard.tsx
│   │   ├── JapaneseText.tsx
│   │   ├── WordLookupSheet.tsx
│   │   └── ZapSplitDialog.tsx
│   ├── auth/           # Authentication components
│   └── ui/             # shadcn/ui components
├── hooks/
│   ├── useSnippets.ts      # Snippet fetching
│   ├── usePreferences.ts   # User preferences
│   ├── useUnknownWords.ts  # Vocabulary tracking
│   ├── useDailyDrift.ts    # Daily session
│   └── useZapSplit.ts      # Zap splitting
├── lib/
│   ├── storage.ts          # IndexedDB layer
│   ├── personalization.ts  # Ranking algorithm
│   ├── japanese.ts         # Japanese utilities
│   └── snippetGenerator.ts # AI generation stub
├── pages/
│   ├── Feed.tsx
│   ├── SettingsPage.tsx
│   ├── SavedPage.tsx
│   ├── WordsPage.tsx
│   ├── StatsPage.tsx
│   ├── DailyDrift.tsx
│   └── Onboarding.tsx
└── types/
    ├── snippet.ts     # Core data types
    └── nostr.ts       # Nostr event types
```

## AI Generation Stub

The `snippetGenerator.ts` provides a stub interface for AI-powered snippet generation:

```typescript
interface AIGeneratorBackend {
  generateSnippet(options: GenerationOptions): Promise<string>;
  translateText(text: string, from: LanguageCode, to: LanguageCode): Promise<string>;
  getReading(text: string, language: LanguageCode): Promise<string>;
  getDefinition(word: string, language: LanguageCode, targetLanguage: LanguageCode): Promise<string>;
}
```

Replace the `stubAIBackend` with your preferred AI service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT

## Credits

- Built with [MKStack](https://soapbox.pub/mkstack)
- Vibed with [Shakespeare](https://shakespeare.diy)
