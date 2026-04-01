# Mid-Conversation Website Fetch Tool — Implementation Plan

## Goal

Allow the pidgie/shopimate chat bot to scrape and analyze a website **mid-conversation** when a user drops a URL. The bot should return a structured analysis (services, pricing, contact info, business type) plus a narrative summary, so the main LLM can reason over it accurately.

**Approach**: Gemini function calling (Option 1) + Structured extraction + Gemini Flash summary (Approach 5)

---

## Architecture Overview

```
User: "Check out https://acme-consulting.com — how can they help my business?"
                            ↓
              Gemini detects URL, calls fetch_website tool
                            ↓
              Tool executes:
                1. scrapeWebsite(url, { maxInternalPages: 5 })  — shallow BFS
                2. detectBusinessSignals(pages)                  — regex extraction
                3. Gemini Flash summarize(combinedContent)       — narrative summary
                            ↓
              Returns to Gemini:
                {
                  businessName: "Acme Consulting",
                  businessType: "services",
                  services: ["Digital Transformation", "Cloud Migration", ...],
                  pricing: ["Enterprise: $5000/mo", ...],
                  contact: { email: "hello@acme.com", phone: "+1..." },
                  industryKeywords: ["fintech", "healthcare", ...],
                  summary: "Acme Consulting specializes in...",
                  homepageExcerpt: "..." (truncated to 3000 chars)
                }
                            ↓
              Gemini reasons over structured data + summary
                            ↓
              "Based on Acme's offerings, here's how they could help..."
```

---

## Key Constraint

`BaseDemoAgent` (used by pidgie-demo + shopimate-landing) does **NOT** support Gemini function calling today. It only does `generateContent` / `generateContentStream` with plain text — no tools, no function declarations.

`BaseAgent` (from `agent-core`) has full tool support but is a heavier abstraction with `LLMClient`, tool masking, diversity config, etc.

**Decision**: Add lightweight tool support directly to `BaseDemoAgent` rather than switching to `BaseAgent`. Keep the interface minimal — the tool execution loop happens internally, consumers (chat handler) only see text chunks.

---

## Phase 1: Add Tool Support to BaseDemoAgent

**File**: `packages/pidgie-shared/src/agent/index.ts`

### 1.1 Tool Interface

```typescript
export interface DemoAgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}
```

### 1.2 Changes to BaseDemoAgent

Add to the class:

- `protected tools: DemoAgentTool[] = []` — registered tools array
- `protected registerTool(tool: DemoAgentTool): void` — register a tool
- `private getToolDeclarations()` — convert tools to Gemini SDK `FunctionDeclarationsTool` format
- Update `chatStream()` to:
  1. Pass tool declarations to `generateContentStream()` via the `tools` option
  2. After consuming the stream, check if the response contains `functionCall` parts
  3. If yes: execute the tool, append the result to contents, call `generateContentStream()` again
  4. Only yield text chunks to the consumer — tool execution is internal
  5. Cap at `MAX_TOOL_ROUNDS = 3` to prevent infinite loops
- Update `chat()` similarly for non-streaming path

### 1.3 Streaming Tool Loop (pseudocode)

```typescript
async *chatStream(userMessage, history) {
  const contents = this.buildContents(userMessage, history);
  const toolDeclarations = this.getToolDeclarations(); // empty array if no tools

  let rounds = 0;
  while (rounds < MAX_TOOL_ROUNDS) {
    const result = await this.model.generateContentStream({
      contents,
      tools: toolDeclarations.length > 0 ? toolDeclarations : undefined,
      generationConfig: { temperature, maxOutputTokens },
    });

    let fullResponse = '';
    let functionCalls: FunctionCall[] = [];

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        yield text;
      }
      // Collect function calls from candidates
      const parts = chunk.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
        }
      }
    }

    // No function calls — we're done
    if (functionCalls.length === 0) break;

    // Execute tools and continue
    for (const call of functionCalls) {
      const tool = this.tools.find(t => t.name === call.name);
      if (!tool) continue;

      const toolResult = await tool.execute(call.args);

      // Append function call + result to contents for next round
      contents.push({
        role: 'model',
        parts: [{ functionCall: call }],
      });
      contents.push({
        role: 'function',
        parts: [{ functionResponse: { name: call.name, response: toolResult } }],
      });
    }

    rounds++;
  }
}
```

### 1.4 Interface Preservation

- `chatStream()` still returns `AsyncGenerator<string>` — no change for consumers
- `createChatHandler` does NOT need changes
- Agents that don't register tools behave exactly as before (empty tools array = no `tools` param passed to Gemini)

---

## Phase 2: Create the `fetch_website` Tool

**File**: `packages/pidgie-core/src/tools/fetch-website.ts` (new)

### 2.1 Tool Definition

```typescript
import { scrapeWebsite } from '../scraper/scraper.js';
import { detectBusinessSignals } from '../detection/index.js';
import { isBlockedUrl } from '@runwell/pidgie-shared/api/ssrf';
import type { DemoAgentTool } from '@runwell/pidgie-shared/agent';

export function createFetchWebsiteTool(options?: {
  maxPages?: number;       // default: 5 (shallow for mid-convo)
  maxSummaryTokens?: number; // default: 1024
}): DemoAgentTool
```

### 2.2 Tool Parameters (what Gemini sees)

```json
{
  "name": "fetch_website",
  "description": "Fetch and analyze a website to understand what a company offers, their services, pricing, and how they could help. Use this when the user mentions a website URL or asks about a specific company's offerings.",
  "parameters": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "The website URL to fetch and analyze"
      }
    },
    "required": ["url"]
  }
}
```

### 2.3 Tool Execution Flow

```
execute({ url }) →
  1. Validate URL (normalize, SSRF check via isBlockedUrl)
  2. scrapeWebsite(url, undefined, { maxInternalPages: 5, followExternalLinks: false })
  3. detectBusinessSignals(scrapedWebsite.pages)
  4. Gemini Flash summary call (separate, cheap, fast):
     - Input: scrapedWebsite.combinedContent (truncated to 15K chars)
     - Prompt: "Summarize this company's offerings, target market, value propositions,
       competitive advantages, and any partnership/collaboration opportunities.
       Be specific — include service names, pricing if found, industries served.
       Max 500 words."
     - Model: gemini-2.0-flash (same model, separate call)
  5. Return structured result
```

### 2.4 Return Shape

```typescript
interface FetchWebsiteResult {
  businessName: string;
  url: string;
  businessType: string;           // from signals
  confidence: number;             // detection confidence 0-1

  // Structured (from signal detection)
  hasProducts: boolean;
  hasServices: boolean;
  hasPricing: boolean;
  hasBooking: boolean;
  primaryOfferings: string[];     // extracted service/product names
  industryKeywords: string[];     // detected niche keywords
  contact: {
    email: string | null;
    phone: string | null;
    form: boolean;
    social: string[];
  };

  // Narrative (from Gemini Flash)
  summary: string;                // ~300-500 word summary

  // Fallback raw (homepage only, truncated)
  homepageExcerpt: string;        // first 3000 chars of homepage bodyText

  // Meta
  pagesScraped: number;
  scrapedAt: string;              // ISO timestamp
}
```

### 2.5 Token Budget

| Component | Estimated Tokens |
|-----------|-----------------|
| Structured fields | ~200-400 |
| Summary (500 words) | ~700 |
| Homepage excerpt (3K chars) | ~800 |
| **Total returned to main Gemini** | **~1700-1900** |

This is well within budget. A 20-page raw dump would be 30K+ tokens.

### 2.6 Latency Budget

| Step | Estimated Time |
|------|---------------|
| Scrape (5 pages, 200ms delay each) | 3-5s |
| Signal detection (regex) | <50ms |
| Gemini Flash summary | 1-2s |
| **Total** | **4-7s** |

Acceptable for a mid-conversation "let me check that for you" moment. The SSE stream will show the text response progressively after this.

---

## Phase 3: Register Tool on All Agent Classes

The `fetch_website` tool needs to be registered on **3 agent classes** across 2 packages:

### 3.1 PidgieAgent (production instances)

**File**: `packages/pidgie-core/src/pidgie.agent.ts`

`PidgieAgent` extends `BaseAgent` which **already has full tool support** (`registerTool()`, function calling loop, tool masking). No plumbing changes needed — just register the tool in `initializeTools()`:

```typescript
import { createFetchWebsiteTool } from './tools/fetch-website.js';

private initializeTools(): void {
  // ... existing pidgie tools ...

  // Mid-conversation website fetch (for analyzing external companies)
  this.registerTool(createFetchWebsiteTool({ maxPages: 5 }));
}
```

**Note**: The `fetch_website` tool uses the `DemoAgentTool` interface (Phase 1). We need a small adapter since `PidgieAgent` uses `AgentTool` from `agent-core` which has a different execute signature (`execute(args, context)` vs `execute(args)`). Two options:
- **Option A**: Make `createFetchWebsiteTool` return the `AgentTool` shape (accepts context, ignores it). This means changing the tool interface to accept an optional context param.
- **Option B**: Wrap it in `initializeTools()` like existing tools. Simplest — matches the existing pattern.

**Recommended: Option B** — keeps the pattern consistent with existing pidgie tools.

### 3.2 Pidgie Demo

**File**: `apps/pidgie-demo/src/lib/agent/demo-pidgie.ts`

```typescript
import { createFetchWebsiteTool } from '@runwell/pidgie-core/tools';

export class DemoPidgieAgent extends BaseDemoAgent {
  constructor(website, config, locale) {
    super({ locale });
    // ... existing setup ...

    // Register mid-conversation website fetch tool
    this.registerTool(createFetchWebsiteTool({ maxPages: 5 }));
  }
}
```

### 3.3 Shopimate Landing

**File**: `apps/shopimate-landing/src/lib/agent/demo-shopimate.ts` (or equivalent)

Same pattern as 3.2 — register the tool in the constructor.

### 3.4 System Prompt Addition

Add to all 3 agents' system prompts (in `buildSystemPrompt` or equivalent):

```
You have access to a fetch_website tool. When a user mentions a website URL or asks
about a specific company, use this tool to fetch and analyze their website. The tool
returns structured data about the company's offerings, contact info, and a summary.
Use this information to provide specific, actionable insights.
```

For `PidgieAgent`: append to the `buildSystemPrompt()` method under "## Available Tools".
For demo agents: append to the system prompt in the constructor.

---

## Phase 4: Export Path

### 4.1 pidgie-core package

**File**: `packages/pidgie-core/package.json` — add export:

```json
"./tools": {
  "import": "./dist/tools/index.js",
  "types": "./dist/tools/index.d.ts"
}
```

**File**: `packages/pidgie-core/src/tools/index.ts` — barrel export:

```typescript
export { createFetchWebsiteTool } from './fetch-website.js';
export type { FetchWebsiteResult } from './fetch-website.js';
```

### 4.2 pidgie-shared package

**File**: `packages/pidgie-shared/src/agent/index.ts` — export new type:

```typescript
export type { DemoAgentTool } from './types.js'; // or inline in agent file
```

---

## Files Summary

**Modified (5):**
| File | Change |
|------|--------|
| `packages/pidgie-shared/src/agent/index.ts` | Add `DemoAgentTool` interface, `registerTool()`, tool-aware `chatStream()` + `chat()` |
| `packages/pidgie-core/src/pidgie.agent.ts` | Register `fetch_website` tool in `initializeTools()` (production pidgie instances) |
| `apps/pidgie-demo/src/lib/agent/demo-pidgie.ts` | Register `fetch_website` tool |
| `apps/shopimate-landing/src/lib/agent/[agent-file].ts` | Register `fetch_website` tool |
| `packages/pidgie-core/package.json` | Add `./tools` export path |

**Created (2):**
| File | Purpose |
|------|---------|
| `packages/pidgie-core/src/tools/fetch-website.ts` | Tool implementation (scrape + detect + summarize) |
| `packages/pidgie-core/src/tools/index.ts` | Barrel export |

**NOT modified:**
| File | Why |
|------|-----|
| `packages/pidgie-shared/src/api/create-chat-handler.ts` | `chatStream()` still yields strings — handler is unchanged |
| `packages/agent-core/src/base/agent.ts` | Not modified — `PidgieAgent` already inherits full tool support from `BaseAgent` |

---

## Implementation Order

```
Phase 1 (BaseDemoAgent tool support)
  ↓
Phase 2 (fetch_website tool)      — depends on Phase 1 (DemoAgentTool interface)
  ↓
Phase 3 (Register on agents)      — depends on Phase 2
  ↓
Phase 4 (Exports)                 — can be done alongside Phase 2
```

All phases are sequential — each depends on the previous.

---

## Verification

1. `npx turbo build --filter=@runwell/pidgie-shared` passes
2. `npx turbo build --filter=@runwell/pidgie-core` passes
3. `npx turbo build --filter=@runwell/pidgie-demo` passes
4. Existing chat (no URLs) still works — agents with no tools behave identically
5. Mid-conversation URL fetch works:
   - User sends "check out https://example.com"
   - Gemini calls `fetch_website` tool
   - Tool scrapes, detects, summarizes
   - Gemini responds with structured analysis
6. SSRF protection: localhost/private IPs rejected
7. Tool loop caps at 3 rounds (no infinite loops)
8. Latency is <7s for the tool execution

---

## Edge Cases to Handle

| Case | Handling |
|------|----------|
| Site returns 403 (Cloudflare) | Tool returns `{ error: "Site blocked access (403). Cannot scrape this website." }` — Gemini tells user |
| Site timeout | Tool returns error after 30s — Gemini explains |
| User sends non-URL text | Gemini doesn't call the tool (function calling handles this naturally) |
| Multiple URLs in one message | Gemini may call the tool multiple times (MAX_TOOL_ROUNDS=3 caps it) |
| Same URL as session's scraped site | Could short-circuit: detect if URL matches session's website, skip re-scrape, return existing data |
| Very large site | maxInternalPages=5 caps scrape depth |
| Non-HTML URL (PDF, image) | Scraper skips non-HTML content types, returns error |

---

## Future Enhancements (not in scope)

- **Caching**: Cache scraped results by URL (like pidgie-demo's SQLite cache) to avoid re-scraping the same site
- **Deeper scrape on demand**: "Tell me more about their pricing" → Gemini calls tool again with specific page URL
- **Comparison mode**: User drops two URLs, bot compares offerings
- **CRM integration**: Store analyzed company data for follow-up
