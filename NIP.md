# Drift Custom NIP: Language Learning Snippet Events

## Kind 38859: Drift Snippet

Drift uses kind `38859` for addressable language learning snippet events. This allows curators to create, share, and organize short text snippets optimized for language immersion learning.

### Event Structure

```json
{
  "kind": 38859,
  "content": "<snippet text>",
  "tags": [
    ["d", "<unique-identifier>"],
    ["L", "drift"],
    ["l", "<language-code>", "drift"],
    ["alt", "Drift language learning snippet: <preview>"],
    ["length", "word|phrase|sentence|paragraph"],
    ["difficulty", "1|2|3|4|5"],
    ["t", "<topic-tag>"],
    ["dialect", "<dialect-tag>"],
    ["content-warning", "<reason>"],
    ["e", "<original-event-id>"],
    ["p", "<original-author-pubkey>"],
    ["ai-generated", "true"],
    ["translation", "<translation-text>"]
  ]
}
```

### Required Tags

| Tag | Description |
|-----|-------------|
| `d` | Unique identifier (UUID) for addressability |
| `L` | Label namespace, must be "drift" |
| `l` | BCP-47 language code (e.g., "ja", "en", "es") with "drift" namespace |
| `alt` | Human-readable description per NIP-31 |

### Optional Tags

| Tag | Description |
|-----|-------------|
| `length` | Content length class: "word", "phrase", "sentence", or "paragraph" |
| `difficulty` | Estimated difficulty 1-5 (1=easiest) |
| `t` | Topic tag(s) for categorization (multiple allowed) |
| `dialect` | Dialect tag (e.g., "標準語", "関西弁", "博多弁" for Japanese) |
| `content-warning` | Present if content contains sensitive material (NIP-36) |
| `e` | Reference to original Nostr event if clipped from existing post |
| `p` | Original author pubkey if clipped from someone else's post |
| `ai-generated` | Set to "true" if content was AI-generated |
| `translation` | Translation of the snippet text |

### Content Field

The `content` field contains the snippet text in the target language. This is the primary learning material displayed to users.

### Example

Japanese casual conversation snippet clipped from a Nostr post:

```json
{
  "kind": 38859,
  "pubkey": "<curator-pubkey>",
  "content": "今日は天気がいいですね。散歩に行きませんか？",
  "created_at": 1705000000,
  "tags": [
    ["d", "a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    ["L", "drift"],
    ["l", "ja", "drift"],
    ["alt", "Drift language learning snippet: \"今日は天気がいいですね。散歩に行きませんか？\""],
    ["length", "sentence"],
    ["difficulty", "2"],
    ["t", "daily-life"],
    ["t", "conversation"],
    ["dialect", "標準語"],
    ["e", "<original-nostr-note-id>"],
    ["p", "<original-author-pubkey>"],
    ["translation", "The weather is nice today. Would you like to go for a walk?"]
  ]
}
```

AI-generated slang snippet:

```json
{
  "kind": 38859,
  "pubkey": "<curator-pubkey>",
  "content": "それな〜わかりみが深い。",
  "created_at": 1705000100,
  "tags": [
    ["d", "f6e5d4c3-b2a1-0987-fedc-ba0987654321"],
    ["L", "drift"],
    ["l", "ja", "drift"],
    ["alt", "Drift language learning snippet: \"それな〜わかりみが深い。\""],
    ["length", "phrase"],
    ["difficulty", "4"],
    ["t", "slang"],
    ["t", "casual"],
    ["dialect", "標準語"],
    ["ai-generated", "true"],
    ["content-warning", "slang"]
  ]
}
```

## Reactions

Drift supports standard NIP-25 reactions on snippet events:

- `+` or 👍 - Like
- `-` or 👎 - Dislike
- ⭐ - Save/bookmark

By default, Drift keeps reactions local for privacy. Users can optionally enable publishing reactions to Nostr.

## Zaps (NIP-57)

Drift implements NIP-57 zaps with a split payment model:

### Zap Split Logic

When zapping a Drift snippet:

1. **Standard Split** (both curator and original author have lightning wallets):
   - 45% to curator
   - 45% to original author
   - 10% to Drift platform

2. **Original Author Missing Wallet**:
   - 67.5% to curator (45% + 22.5%)
   - 32.5% to Drift platform (10% + 22.5%)

3. **Curator Missing Wallet**:
   - 67.5% to original author (45% + 22.5%)
   - 32.5% to Drift platform (10% + 22.5%)

4. **Neither Has Wallet**:
   - 100% to Drift platform

### Implementation

Clients implementing zap splits should:

1. Fetch metadata (kind 0) for both curator and original author
2. Check for `lud16` or `lud06` fields
3. Calculate split amounts
4. Display confirmation UI showing recipients and amounts
5. Process individual zaps to each recipient

## Querying Snippets

To fetch Drift snippets:

```json
{
  "kinds": [38859],
  "#L": ["drift"],
  "#l": ["ja"],
  "limit": 100
}
```

Filter by topic:

```json
{
  "kinds": [38859],
  "#L": ["drift"],
  "#t": ["casual"],
  "limit": 50
}
```

Filter by difficulty:

```json
{
  "kinds": [38859],
  "#L": ["drift"],
  "#difficulty": ["1", "2"],
  "limit": 50
}
```

## Privacy Considerations

Drift is privacy-first by design:

1. **Local Personalization**: All user preference signals (dwell time, likes, word taps) are stored locally in IndexedDB
2. **Optional Identity**: Users can browse without logging in
3. **Optional Reaction Publishing**: Reactions are local by default
4. **No Tracking**: No analytics or user tracking

## Relay Recommendations

Drift works with any Nostr relay. Recommended relays:

- `wss://relay.ditto.pub` - Good for general Nostr content
- `wss://relay.nostr.band` - Indexed relay with search
- `wss://relay.damus.io` - Popular general relay

## Future Extensions

Potential future additions:

- `furigana` tag with reading data for Japanese text
- `audio` tag for pronunciation audio URL
- `exercise` tag for interactive learning exercises
- `difficulty-data` tag with detailed linguistic analysis
