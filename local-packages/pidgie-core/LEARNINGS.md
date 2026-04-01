# BIB Pidgie - Learnings

Best practices and patterns discovered during pidgie deployments.

---

## Environment Configuration

### API Key Standardization

All BIB Pidgie deployments use `GEMINI_API_KEY` as the environment variable name.

```bash
# .env.local
GEMINI_API_KEY=your-api-key-here
```

**Get your key:** https://aistudio.google.com/apikey

**Why not GOOGLE_AI_API_KEY?**
- `GEMINI_API_KEY` is more intuitive and matches the product name
- Established pattern from hidden-beans deployment
- agent-core supports both (prefers `GEMINI_API_KEY`, falls back to `GOOGLE_AI_API_KEY`)

---

## Gemini API Integration

### System Instruction Format

The Gemini API requires `systemInstruction` to be an object with `role` and `parts`, not a plain string.

```typescript
// WRONG - causes 400 Bad Request
const chat = model.startChat({
  systemInstruction: "You are a helpful assistant...",
});

// CORRECT
const chat = model.startChat({
  systemInstruction: {
    role: 'user',
    parts: [{ text: "You are a helpful assistant..." }],
  },
});
```

### Model Selection

Use `gemini-2.0-flash` for pidgie bots:
- Fast response times (important for chat UX)
- Cost-effective for high-volume chat
- Sufficient quality for FAQ/business info queries

```typescript
const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
```

### Generation Config

Recommended settings for pidgie responses:

```typescript
generationConfig: {
  maxOutputTokens: 1024,  // Keep responses concise
  temperature: 0.7,       // Balance creativity/consistency
}
```

---

## CORS Configuration

### Always Include Development Ports

When running on non-standard ports during development, add them to CORS whitelist:

```typescript
const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'https://staging.yourdomain.com',
  'http://localhost:3000',
  'http://localhost:3001',  // Common alternate port
  'http://localhost:3002',  // Another alternate
];
```

### Origin Header Behavior

- Browser requests include `Origin` header
- Server-to-server requests (curl without -H Origin) may not include it
- Allow `null` origin for same-origin requests: `if (!origin) return true;`

---

## React Component Patterns

### Avoid Infinite Loops in useEffect

When updating state based on language changes, don't include the state array in dependencies:

```typescript
// WRONG - causes infinite loop
useEffect(() => {
  if (messages[0]?.id === 'greeting') {
    setMessages(prev => [{ ...prev[0], content: t.greeting }, ...prev.slice(1)]);
  }
}, [lang, t.greeting, messages]); // messages causes loop!

// CORRECT - use functional update without messages dependency
useEffect(() => {
  setMessages(prev => {
    if (prev[0]?.id === 'greeting') {
      return [{ ...prev[0], content: t.greeting }, ...prev.slice(1)];
    }
    return prev;
  });
}, [lang, t.greeting]); // No messages dependency
```

### Session ID Management

Generate session ID on first API call, not on component mount:

```typescript
const [sessionId, setSessionId] = useState<string | null>(null);

// In sendMessage:
const currentSessionId = sessionId || uuidv4();
// Update from API response
if (data.sessionId && !sessionId) {
  setSessionId(data.sessionId);
}
```

---

## Security Patterns

### Prompt Injection Blocking

Block common injection patterns before sending to LLM:

```typescript
const BLOCKED_PATTERNS = [
  /ignore.{0,20}(previous|all|prior).{0,20}instruction/i,
  /repeat.{0,20}(system|prompt|instruction)/i,
  /you are (now|no longer)/i,
  /pretend (to be|you are)/i,
  /\bdan\b.{0,20}(mode|jailbreak)/i,
];

if (BLOCKED_PATTERNS.some(p => p.test(userMessage))) {
  return { message: greeting }; // Return safe response
}
```

### Error Sanitization

Never expose internal errors to users:

```typescript
function sanitizeError(error: unknown): string {
  // Log full error server-side
  console.error('Full error:', error);

  // Return generic message to client
  if (error.message?.includes('API_KEY')) {
    return 'Service temporarily unavailable';
  }
  return 'An error occurred. Please try again.';
}
```

---

## Multilingual Support

### Language Detection from Context

Use the site's existing language context rather than detecting from message:

```typescript
// In chat component
const { lang } = useLanguage();

// Pass to API
body: JSON.stringify({
  messages: apiMessages,
  language: lang,  // 'fr' | 'en' | 'de'
})
```

### Greeting Updates on Language Change

Update the greeting message when user switches language:

```typescript
useEffect(() => {
  if (hasGreeted) {
    setMessages(prev => {
      if (prev[0]?.id === 'greeting') {
        return [{ ...prev[0], content: t.greeting }, ...prev.slice(1)];
      }
      return prev;
    });
  }
}, [lang, t.greeting, hasGreeted]);
```

---

## Testing Checklist

Before deploying a pidgie bot:

1. **API Tests**
   - [ ] Basic question in each supported language
   - [ ] Prompt injection blocked
   - [ ] Multi-turn conversation works
   - [ ] Input validation rejects bad input
   - [ ] Rate limiting works

2. **Frontend Tests**
   - [ ] Chat widget renders
   - [ ] Greeting appears on open
   - [ ] Messages send and receive
   - [ ] Loading state shows
   - [ ] Error state shows
   - [ ] Language switching updates greeting

3. **Security Tests**
   - [ ] CORS blocks unauthorized origins
   - [ ] Prompt injection returns safe response
   - [ ] Errors don't leak internal details

---

## Deployment Sequence

1. Configure `GEMINI_API_KEY` in `.env.local`
2. Add domain to CORS whitelist
3. Build and deploy
4. Run security tests with pentest-runner
5. Monitor health endpoint

---

## Scraper: Priority Crawling for Product Discovery

### URL Priority Scoring

When scraping e-commerce or catalog sites, product/service pages should be crawled first. The scraper uses `scoreUrl()` to prioritize URLs matching known product patterns (`/products`, `/shop`, `/catalog`, `/equipment`, etc.).

```typescript
import { scoreUrl } from './url-utils.js';

// High-scoring URLs get unshift() to front of BFS queue
if (scoreUrl(link) > 0) {
  state.queue.unshift(link);  // Crawl first
} else {
  state.queue.push(link);     // Crawl later
}
```

**Trade-off:** Product pages may starve informational pages (about, contact, FAQ) when the page budget is limited. This is acceptable for product discovery use cases.

### bodyText Paragraph Preservation

The scraper preserves paragraph breaks (`\n\n`) in `bodyText` instead of collapsing everything to spaces. This enables downstream parsers to split content into meaningful blocks.

```typescript
// Old (destroyed structure)
.replace(/\s+/g, ' ')

// New (preserves paragraphs)
.replace(/[ \t]+/g, ' ')       // horizontal whitespace only
.replace(/\n{3,}/g, '\n\n')    // normalize excessive newlines
.replace(/\n /g, '\n')         // trim leading spaces after newlines
```

### Multi-Currency Price Parsing

When extracting prices from international sites, handle both US (`1,299.50`) and European (`1.299,50`) notation by comparing the position of the last comma vs last dot:

```typescript
const lastComma = numeric.lastIndexOf(",");
const lastDot = numeric.lastIndexOf(".");
if (lastComma > lastDot) {
  // European: comma is decimal separator
  return parseFloat(numeric.replace(/\./g, "").replace(",", "."));
} else {
  // US: dot is decimal separator
  return parseFloat(numeric.replace(/,/g, ""));
}
```

### Raw Content Fallback for LLM Prompts

When structured product extraction fails (< 5 products), inject raw `combinedContent` into the LLM system prompt as a fallback. This lets the LLM answer questions about the business from page text even without a structured catalog.

**Security:** Strip markdown headers from injected content to prevent prompt section overrides, and add an explicit instruction not to follow embedded instructions.

---

## Suggestion System: Unified Format & Perspective Anchoring

### Unified [SUGGESTIONS:] Format

**Problem:** Two different tag formats (`<suggestions>` and `[SUGGESTIONS:]`) across bots, with parsers copy-pasted in each route file.

**Solution:** Standardize on `[SUGGESTIONS: q1 | q2 | q3]`. Single `parseSuggestions()` in `pidgie-core/suggestions`, re-exported from `pidgie-shared/api` for route handlers.

```typescript
import { buildSuggestionPromptFragment } from '@runwell/pidgie-core/suggestions';

// Backward-compatible: accepts string mode or full config
const { promptText } = buildSuggestionPromptFragment({
  mode: 'sales',
  perspective: 'user-asks-bot',
});
```

### Perspective Anchoring Prevents Wrong Suggestions

**Problem:** LLMs generate bot-perspective suggestions ("What's your biggest challenge?") instead of user-perspective ones ("How does pricing work?").

**Solution:** `SuggestionPerspective` type with anchor text containing good/bad examples. The anchor explicitly says "Suggestions must be phrased as things the USER would say to you."

**Perspectives:**
- `'user-asks-bot'` (default) — "How does pricing work?", "Can I see a demo?"
- `'bot-asks-user'` — "What's your biggest challenge?", "What industry are you in?"

### Backward-Compatible Overload Pattern

Accept `SuggestionMode | SuggestionConfig` and normalize at the top:

```typescript
const normalized = typeof config === 'string' ? { mode: config } : config;
```

All existing callers keep working without changes.

---

## Stress Testing (Toumana, 2026-02-13)

### Stress Test Script Pattern

`simulations/scripts/stress-test-toumana.ts` — sends real HTTP requests to the staging SSE endpoint, parses the SSE stream, runs keyword-based checks, generates a markdown report.

- Each scenario gets a unique `sessionId` (UUID) for isolation
- Multi-turn scenarios reuse the same session for context retention testing
- `expectError` field triggers HTTP status code assertion instead of response checks
- 1.5s delay between scenarios to avoid rate limiting

### Multilingual Keyword Matching

When the bot defaults to French (primary language), response checks must include French equivalents:
- `"not allowed"` → also check `"pas admis"`, `"ne sont pas"`
- `"reservation"` → also check `"réserv"`
- `"unfortunately"` → also check `"malheureusement"`

### SSE Stream Parsing

The staging API returns `text/event-stream` with three event types:
- `{ type: "text", content: "..." }` — concatenate for full response
- `{ type: "suggestions", suggestions: [...] }` — UI suggestions
- `{ type: "done" }` — stream complete
- `{ type: "error", content: "..." }` — error message

Buffer lines and parse only `data: ` prefixed lines. Handle partial chunks with a rolling buffer.

### Language Detection Heuristic

Simple keyword-count approach (≥2 markers from a language's word list). Works for clear single-language responses but can false-positive on mixed-language text. Sufficient for stress testing, not for production language detection.

---

See also: [GOTCHAS.md](./GOTCHAS.md) for common pitfalls.
