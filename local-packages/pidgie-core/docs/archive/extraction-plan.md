# bib-concierge Extraction & Unification Plan

> **STATUS: PHASE A COMPLETE** (2026-02-06)
>
> All extraction phases completed:
> - Phase A1: Scraper Module ✅
> - Phase A2: Screenshot Module ✅
> - Phase A3: useChat Hook ✅
> - Phase A4: Chat UI Components (widget already existed) ✅
> - Phase A5: System Prompt Builder ✅
> - Phase A6: Detection Module (already in sync) ✅
>
> **Next Steps:** Phase B - Refactor concierge-demo to use extracted modules

## Overview

**Extract** common functionality from `concierge-demo` into `@runwell/bib-concierge` AND **unify** duplicated code so both `concierge-demo` and `shopimate-landing` share the same battle-tested codebase.

**Goals:**
1. **Extract:** Move scraper, screenshot, chat UI, etc. into shared package
2. **Unify:** Eliminate duplicate detection code (exists in both places)
3. **Refactor:** Update concierge-demo to consume from package
4. **Enable:** shopimate-landing demo to use same modules

**Source:** `/Users/balencia/Documents/Code/concierge-demo`
**Target:** `/Users/balencia/Documents/Code/runwell-bib/packages/bib-concierge`

**Consumers:**
- `concierge-demo` (refactored to use package)
- `shopimate-landing` (new demo feature)

---

## Phase A1: Scraper Module
**Estimated: 1.5 hours**

### Files to Create in bib-concierge

```
src/scraper/
├── index.ts              # Main exports
├── scraper.ts            # Core scraping logic
├── types.ts              # ScrapedPage, ScrapedWebsite, ScraperOptions
├── url-utils.ts          # URL normalization, validation
└── content-utils.ts      # Text extraction, truncation
```

### From concierge-demo
- `src/lib/scraper.ts` → `src/scraper/scraper.ts`

### Types to Export
```typescript
export interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
  links: string[];
  isExternal: boolean;
  domain: string;
}

export interface ScrapedWebsite {
  url: string;
  pages: ScrapedPage[];
  combinedContent: string;
  businessName: string;
  language?: string;
  signals: BusinessSignals;
}

export interface ScraperOptions {
  maxInternalPages?: number;    // Default: 10
  maxExternalPages?: number;    // Default: 5
  followExternalLinks?: boolean; // Default: true
  maxContentChars?: number;     // Default: 75,000
  onProgress?: (status: string, pagesScraped: number) => void;
}

export async function scrapeWebsite(
  url: string,
  options?: ScraperOptions
): Promise<ScrapedWebsite>;

export function normalizeUrl(url: string): string;
export function isValidUrl(url: string): boolean;
```

### Dependencies to Add
```json
{
  "cheerio": "^1.0.0"
}
```

### Update package.json exports
```json
{
  "exports": {
    "./scraper": {
      "import": "./dist/scraper/index.js",
      "types": "./dist/scraper/index.d.ts"
    }
  }
}
```

### Testing
```typescript
import { scrapeWebsite } from '@runwell/bib-concierge/scraper';

const result = await scrapeWebsite('https://example.com', {
  maxInternalPages: 5,
  onProgress: (status, count) => console.log(status, count)
});

console.log(result.businessName);
console.log(result.pages.length);
console.log(result.signals);
```

---

## Phase A2: Screenshot Module
**Estimated: 1 hour**

### Files to Create

```
src/screenshot/
├── index.ts              # Main exports
├── screenshot.ts         # Playwright capture logic
└── types.ts              # ScreenshotResult, ScreenshotOptions
```

### From concierge-demo
- `src/lib/screenshot.ts` → `src/screenshot/screenshot.ts`

### Types to Export
```typescript
export interface ScreenshotResult {
  mobile: string | null;   // File path or base64
  desktop: string | null;
}

export interface ScreenshotOptions {
  url: string;
  sessionId: string;
  outputDir?: string;      // Default: './screenshots'
  timeout?: number;        // Default: 10000ms
  mobileViewport?: { width: number; height: number };  // Default: 390x844
  desktopViewport?: { width: number; height: number }; // Default: 1280x800
}

export async function captureScreenshots(
  options: ScreenshotOptions
): Promise<ScreenshotResult>;

export async function captureScreenshot(
  url: string,
  viewport: { width: number; height: number },
  timeout?: number
): Promise<Buffer>;
```

### Dependencies to Add
```json
{
  "playwright": "^1.40.0"
}
```

### Note on Playwright
- Requires `serverExternalPackages: ['playwright']` in Next.js config
- Docker needs Chromium dependencies (use Debian-slim, not Alpine)
- Browser instance reused for performance

### Update package.json exports
```json
{
  "exports": {
    "./screenshot": {
      "import": "./dist/screenshot/index.js",
      "types": "./dist/screenshot/index.d.ts"
    }
  }
}
```

---

## Phase A3: Chat Hook (React)
**Estimated: 45 min**

### Files to Create

```
src/widget/hooks/
├── index.ts
├── use-chat.ts           # SSE streaming hook
└── types.ts              # UseChatOptions, UseChatReturn
```

### From concierge-demo
- `src/lib/chat/use-chat.ts` → `src/widget/hooks/use-chat.ts`

### Types to Export
```typescript
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface UseChatOptions {
  sessionId: string;
  apiEndpoint?: string;    // Default: '/api/chat'
  initialMessages?: Message[];
  onError?: (error: Error) => void;
  onMessage?: (message: Message) => void;
}

export interface UseChatReturn {
  messages: Message[];
  displayMessages: Message[];  // Includes streaming content
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  abort: () => void;
}

export function useChat(options: UseChatOptions): UseChatReturn;
```

### Update widget/index.ts exports
```typescript
// Add to existing widget exports
export { useChat } from './hooks/use-chat';
export type { Message, UseChatOptions, UseChatReturn } from './hooks/types';
```

---

## Phase A4: Chat UI Components
**Estimated: 1.5 hours**

### Files to Create

```
src/widget/components/
├── index.ts
├── chat-interface.tsx    # Full-screen chat container
├── message-list.tsx      # Message display with markdown
├── chat-input.tsx        # Input textarea + send button
├── typing-indicator.tsx  # Animated dots
└── styles.ts             # Shared styles/classnames
```

### From concierge-demo
- `src/components/chat/chat-interface.tsx` → `src/widget/components/chat-interface.tsx`
- `src/components/chat/message-list.tsx` → `src/widget/components/message-list.tsx`
- `src/components/chat/chat-input.tsx` → `src/widget/components/chat-input.tsx`

### Component Props
```typescript
// ChatInterface - Full container
export interface ChatInterfaceProps {
  sessionId: string;
  businessName: string;
  websiteUrl?: string;
  pagesScraped?: number;
  initialMessages?: Message[];
  apiEndpoint?: string;
  onReset?: () => void;
  className?: string;
  theme?: ChatTheme;
}

// MessageList - Display messages
export interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
  className?: string;
  renderMessage?: (message: Message, index: number) => React.ReactNode;
}

// ChatInput - Input field
export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;      // Default: 2000
  className?: string;
}

// Theme customization
export interface ChatTheme {
  primaryColor?: string;
  backgroundColor?: string;
  userMessageBg?: string;
  assistantMessageBg?: string;
  textColor?: string;
  borderRadius?: string;
}
```

### Dependencies to Add
```json
{
  "react-markdown": "^9.0.0"
}
```

### Update widget/index.ts exports
```typescript
export { ChatInterface } from './components/chat-interface';
export { MessageList } from './components/message-list';
export { ChatInput } from './components/chat-input';
export { TypingIndicator } from './components/typing-indicator';
export type { ChatInterfaceProps, MessageListProps, ChatInputProps, ChatTheme } from './components/types';
```

---

## Phase A5: System Prompt Builder
**Estimated: 1 hour**

### Files to Create

```
src/agent/
├── index.ts              # Existing + new exports
├── system-prompt.ts      # Dynamic prompt builder
└── prompt-templates.ts   # Template strings by business type
```

### From concierge-demo
- `src/lib/agent/system-prompt.ts` → `src/agent/system-prompt.ts`

### Types to Export
```typescript
export interface SystemPromptContext {
  businessName: string;
  businessType: BusinessType;
  signals: BusinessSignals;
  tone: Tone;
  customInstructions?: string;
  products?: ProductInfo[];      // For e-commerce
  additionalContext?: string;
}

export interface SystemPromptOptions {
  includeSecurityRules?: boolean;  // Default: true
  includeGreeting?: boolean;       // Default: true
  maxProductsInPrompt?: number;    // Default: 50
}

export function buildSystemPrompt(
  context: SystemPromptContext,
  options?: SystemPromptOptions
): string;

export function buildEcommercePrompt(
  context: SystemPromptContext & {
    products: ProductInfo[];
    mockInventory?: boolean;
  }
): string;
```

### Template Structure
```typescript
// Prompts vary by business type
const PROMPT_TEMPLATES = {
  ecommerce: `You are a helpful sales assistant for {businessName}...`,
  services: `You are a helpful assistant for {businessName}, a service business...`,
  saas: `You are a helpful assistant for {businessName}, a software company...`,
  local: `You are a helpful assistant for {businessName}, a local business...`,
  // etc.
};
```

---

## Phase A6: Unify Detection Module (Critical)
**Estimated: 45 min**

### Problem: Duplicated Code
The detection module exists in TWO places that have diverged:
- `concierge-demo/src/lib/agent/detection.ts` - LOCAL COPY (used at runtime)
- `bib-concierge/src/detection/` - PACKAGE VERSION (not used by concierge-demo)

This violates DRY and causes sync issues when updating patterns.

### Current State Analysis
```bash
# Compare the two files
diff -u \
  /Users/balencia/Documents/Code/concierge-demo/src/lib/agent/detection.ts \
  /Users/balencia/Documents/Code/runwell-bib/packages/bib-concierge/src/detection/detector.ts
```

### Unification Steps

1. **Audit differences** between the two versions
   - Check for any patterns added to one but not the other
   - Check for type differences
   - Identify the "canonical" version (likely bib-concierge is more complete)

2. **Merge any missing patterns** into bib-concierge version
   - Product patterns
   - Contact method patterns
   - Business type detection
   - Any new signals

3. **Update bib-concierge exports** to ensure all types/functions are exported:
   ```typescript
   // src/detection/index.ts
   export { detectBusinessSignals, detectContactMethods } from './detector';
   export type { BusinessType, BusinessSignals, ContactMethods, Tone, DetectionResult } from './types';
   ```

4. **Update concierge-demo imports**:
   ```typescript
   // Before (in concierge-demo)
   import { detectBusinessSignals, BusinessSignals, Tone } from '@/lib/agent/detection';

   // After
   import { detectBusinessSignals } from '@runwell/bib-concierge/detection';
   import type { BusinessSignals, Tone } from '@runwell/bib-concierge/detection';
   ```

5. **Delete the duplicate**:
   ```bash
   rm /Users/balencia/Documents/Code/concierge-demo/src/lib/agent/detection.ts
   ```

6. **Update all imports in concierge-demo** that reference the deleted file

### Files Affected in concierge-demo
- `src/lib/agent/demo-concierge.ts` - Uses BusinessSignals, Tone
- `src/lib/agent/system-prompt.ts` - Uses BusinessSignals, BusinessType, Tone
- `src/lib/agent/types.ts` - Re-exports types (may be deleted too)
- `src/lib/scraper.ts` - Calls detectBusinessSignals()
- `src/app/api/scrape/route.ts` - May reference signals

### Types to Verify Are Exported
```typescript
// Must all be exported from @runwell/bib-concierge/detection
export type BusinessType =
  | 'ecommerce' | 'services' | 'saas' | 'local'
  | 'portfolio' | 'b2b' | 'other';

export interface BusinessSignals {
  businessType: BusinessType;
  hasProducts: boolean;
  hasServices: boolean;
  hasPricing: boolean;
  hasBooking: boolean;
  hasCaseStudies: boolean;
  hasTeamPage: boolean;
  hasFaq: boolean;
  hasBlog: boolean;
  primaryOfferings: string[];
  industryKeywords: string[];
  contactMethods: ContactMethods;
  confidence: number;
}

export interface ContactMethods {
  email: string | null;
  phone: string | null;
  hasContactForm: boolean;
  hasLiveChat: boolean;
  socialLinks: string[];
}

export type Tone = 'friendly' | 'professional' | 'casual';
```

### Testing After Unification
```bash
cd /Users/balencia/Documents/Code/concierge-demo
pnpm build  # Should compile without errors

# Test detection still works
curl -X POST localhost:3017/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://allbirds.com"}'

# Response should include signals:
# { "signals": { "businessType": "ecommerce", "hasProducts": true, ... } }
```

---

## Phase A7: Update Package Exports
**Estimated: 30 min**

### Update `package.json`
```json
{
  "name": "@runwell/bib-concierge",
  "exports": {
    ".": "./dist/index.js",
    "./agent": "./dist/agent/index.js",
    "./scraper": "./dist/scraper/index.js",
    "./screenshot": "./dist/screenshot/index.js",
    "./widget": "./dist/widget/index.js",
    "./widget/hooks": "./dist/widget/hooks/index.js",
    "./widget/components": "./dist/widget/components/index.js",
    "./detection": "./dist/detection/index.js",
    "./session": "./dist/session/index.js",
    "./cache": "./dist/cache/index.js",
    "./streaming": "./dist/streaming/index.js",
    "./security": "./dist/security/index.js",
    "./voice": "./dist/voice/index.js",
    "./tools": "./dist/tools/index.js",
    "./analytics": "./dist/analytics/index.js",
    "./types": "./dist/types/index.js"
  }
}
```

### Update `src/index.ts`
```typescript
// Re-export all modules
export * from './agent';
export * from './scraper';
export * from './screenshot';
export * from './widget';
export * from './detection';
export * from './session';
export * from './cache';
export * from './streaming';
export * from './security';
export * from './voice';
export * from './tools';
export * from './analytics';
export * from './types';
```

---

## Phase B: Refactor concierge-demo
**Estimated: 1-2 hours**

### B1: Update Imports

| Old Import | New Import |
|------------|------------|
| `@/lib/scraper` | `@runwell/bib-concierge/scraper` |
| `@/lib/screenshot` | `@runwell/bib-concierge/screenshot` |
| `@/lib/chat/use-chat` | `@runwell/bib-concierge/widget/hooks` |
| `@/components/chat/*` | `@runwell/bib-concierge/widget/components` |
| `@/lib/agent/detection` | `@runwell/bib-concierge/detection` |
| `@/lib/agent/system-prompt` | `@runwell/bib-concierge/agent` |

### B2: Delete Local Copies
```bash
rm src/lib/scraper.ts
rm src/lib/screenshot.ts
rm src/lib/chat/use-chat.ts
rm src/lib/agent/detection.ts
rm src/lib/agent/system-prompt.ts
rm -rf src/components/chat/  # Keep only app-specific components
```

### B3: Keep App-Specific
- `src/lib/db.ts` - SQLite specific to concierge-demo
- `src/lib/cache.ts` - Uses local SQLite
- `src/lib/session-store.ts` - Extended session with screenshots
- `src/lib/agent/demo-concierge.ts` - Gemini-specific agent
- `src/app/` - All pages and API routes

### B4: Test Concierge-Demo
```bash
cd /Users/balencia/Documents/Code/concierge-demo
pnpm install
pnpm build
pnpm dev

# Test full flow
# 1. Enter URL
# 2. Verify scraping works
# 3. Verify chat works
# 4. Verify screenshots work
```

---

## Testing Checklist

### After Phase A (Package)
```bash
cd /Users/balencia/Documents/Code/runwell-bib
pnpm build --filter=@runwell/bib-concierge

# Verify exports
node -e "const pkg = require('./packages/bib-concierge/dist'); console.log(Object.keys(pkg))"
```

### After Phase B (Concierge-Demo)
```bash
cd /Users/balencia/Documents/Code/concierge-demo
pnpm dev

# Full E2E test
1. Go to http://localhost:3017
2. Enter: https://allbirds.com
3. Wait for scrape
4. Chat: "What products do you have?"
5. Verify response references Allbirds products
```

---

## Dependencies Summary

### Add to bib-concierge
```json
{
  "dependencies": {
    "cheerio": "^1.0.0",
    "react-markdown": "^9.0.0"
  },
  "peerDependencies": {
    "playwright": "^1.40.0",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "playwright": { "optional": true }
  }
}
```

### Note on Playwright
Playwright is optional peer dependency - only needed if using screenshot module. This keeps the package lighter for apps that don't need screenshots.

---

## File Structure (Final)

```
packages/bib-concierge/src/
├── index.ts
├── agent/
│   ├── index.ts
│   ├── concierge.agent.ts     # Existing
│   ├── system-prompt.ts       # NEW
│   └── prompt-templates.ts    # NEW
├── scraper/                   # NEW
│   ├── index.ts
│   ├── scraper.ts
│   ├── types.ts
│   ├── url-utils.ts
│   └── content-utils.ts
├── screenshot/                # NEW
│   ├── index.ts
│   ├── screenshot.ts
│   └── types.ts
├── widget/
│   ├── index.ts
│   ├── concierge-widget.tsx   # Existing
│   ├── voice-button.tsx       # Existing
│   ├── hooks/                 # NEW
│   │   ├── index.ts
│   │   ├── use-chat.ts
│   │   └── types.ts
│   └── components/            # NEW
│       ├── index.ts
│       ├── chat-interface.tsx
│       ├── message-list.tsx
│       ├── chat-input.tsx
│       └── typing-indicator.tsx
├── detection/                 # Existing (unchanged)
├── session/                   # Existing (unchanged)
├── cache/                     # Existing (unchanged)
├── streaming/                 # Existing (unchanged)
├── security/                  # Existing (unchanged)
├── voice/                     # Existing (unchanged)
├── tools/                     # Existing (unchanged)
├── analytics/                 # Existing (unchanged)
└── types/                     # Existing (unchanged)
```

---

## Time Estimate

| Phase | Time |
|-------|------|
| A1: Scraper | 1.5 hours |
| A2: Screenshot | 1 hour |
| A3: Chat Hook | 45 min |
| A4: Chat Components | 1.5 hours |
| A5: System Prompt | 1 hour |
| A6: Unify Detection | 30 min |
| A7: Package Exports | 30 min |
| B: Refactor concierge-demo | 1-2 hours |
| **Total** | **~8-9 hours** |
