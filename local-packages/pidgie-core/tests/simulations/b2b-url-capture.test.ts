/**
 * Simulation Test: B2B Visitor URL-Capture
 *
 * End-to-end test that scrapes a real B2B website, builds the system prompt,
 * runs a multi-turn conversation with Gemini, and asserts the bot asks for
 * the visitor's URL at the right time.
 *
 * Run: pnpm --filter @runwell/pidgie-core test:simulate
 * Requires: GEMINI_API_KEY env var
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { scrapeWebsite } from '../../src/scraper/index.js';
import { buildSystemPrompt } from '../../src/prompt/index.js';
import { buildSuggestionPromptFragment } from '../../src/suggestions/index.js';
import { getDefaultTone } from '../../src/detection/index.js';
import type { ScrapedWebsite } from '../../src/scraper/index.js';
import { GoogleGenerativeAI, type ChatSession } from '@google/generative-ai';

// ── Config ───────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HAS_API_KEY = !!GEMINI_API_KEY;

const URL_REQUEST_PATTERNS = [
  /your (?:website|url|site|link)/i,
  /share (?:your|the) (?:url|website|link|site)/i,
  /take a (?:look|quick look) at your (?:website|site)/i,
  /what(?:'s| is) your (?:website|url|site)/i,
  /send (?:me |us )?(?:your |the )?(?:url|website|link|site)/i,
  /company(?:'s)? (?:website|url|site)/i,
  /do you have a (?:website|url|site)/i,
];

function detectsUrlRequest(text: string): boolean {
  return URL_REQUEST_PATTERNS.some(p => p.test(text));
}

// ── Helpers ──────────────────────────────────────────────────────────

interface ConversationTurn {
  turn: number;
  user: string;
  bot: string;
  urlAsked: boolean;
  suggestions: string[];
}

async function runConversation(
  chat: ChatSession,
  messages: string[]
): Promise<ConversationTurn[]> {
  const turns: ConversationTurn[] = [];
  let urlAlreadyAsked = false;

  for (let i = 0; i < messages.length; i++) {
    const result = await chat.sendMessage(messages[i]);
    const bot = result.response.text();

    const urlAsked = !urlAlreadyAsked && detectsUrlRequest(bot);
    if (urlAsked) urlAlreadyAsked = true;

    const sugMatch = bot.match(/\[SUGGESTIONS?:\s*([^\]]+)\]/i);
    const suggestions = sugMatch
      ? sugMatch[1].split('|').map(s => s.trim()).filter(Boolean)
      : [];

    turns.push({ turn: i + 1, user: messages[i], bot, urlAsked, suggestions });
  }

  return turns;
}

function buildChat(systemPrompt: string): ChatSession {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
  });
  return model.startChat({ history: [] });
}

function buildPromptForWebsite(website: ScrapedWebsite): string {
  const tone = getDefaultTone(website.signals.businessType);
  return (
    buildSystemPrompt(
      { website, config: { tone } },
      { maxContentLength: 8000 }
    ) +
    '\n\n' +
    buildSuggestionPromptFragment({ mode: 'pidgie', perspective: 'user-asks-bot' }).promptText
  );
}

// ── Tests ────────────────────────────────────────────────────────────

describe.skipIf(!HAS_API_KEY)('Simulation: B2B Visitor URL-Capture', () => {
  // ── Capital V (PR/Communications firm) ───────────────────────────

  describe('Capital V (services — PR firm)', () => {
    let website: ScrapedWebsite;
    let systemPrompt: string;
    let turns: ConversationTurn[];

    beforeAll(async () => {
      website = await scrapeWebsite('https://capvstrategies.com');

      systemPrompt = buildPromptForWebsite(website);

      const chat = buildChat(systemPrompt);
      turns = await runConversation(chat, [
        "Hi, I'm looking to improve my company's media presence. What do you guys do exactly?",
        "That sounds interesting. We've been struggling to get any press coverage for our product launches. How do you typically approach that?",
        "We're a fintech startup — we have a payments API. Our last two product launches got zero coverage. What would you suggest?",
        "That makes sense. What kind of results have your clients seen?",
        "How do we get started?",
      ]);
    }, 120_000);

    // Detection
    it('detects business type as services or b2b', () => {
      expect(['services', 'b2b']).toContain(website.signals.businessType);
    });

    it('injects B2B Visitor Discovery section', () => {
      expect(systemPrompt).toContain('## Visitor Business Discovery');
    });

    it('interpolates "Capital V" into B2B section', () => {
      expect(systemPrompt).toContain("Capital V's specific services/solutions");
    });

    // URL capture timing
    it('does NOT ask for URL on the first message', () => {
      expect(turns[0].urlAsked).toBe(false);
    });

    it('asks for visitor URL within the first 3 turns', () => {
      const urlTurn = turns.find(t => t.urlAsked);
      expect(urlTurn).toBeDefined();
      expect(urlTurn!.turn).toBeLessThanOrEqual(3);
    });

    it('asks for URL after at least 1 exchange (rapport first)', () => {
      const urlTurn = turns.find(t => t.urlAsked);
      expect(urlTurn).toBeDefined();
      expect(urlTurn!.turn).toBeGreaterThanOrEqual(2);
    });

    // Response quality
    it('first response explains what Capital V does', () => {
      const bot = turns[0].bot.toLowerCase();
      expect(
        bot.includes('capital v') ||
        bot.includes('communications') ||
        bot.includes('media') ||
        bot.includes('pr')
      ).toBe(true);
    });

    it('generates follow-up suggestions on most turns', () => {
      // LLM output is non-deterministic — require at least 3/5 turns to have suggestions
      const turnsWithSuggestions = turns.filter(t => t.suggestions.length > 0).length;
      expect(turnsWithSuggestions).toBeGreaterThanOrEqual(3);
    });

    it('suggestions are user-perspective (not bot questions)', () => {
      // User-perspective suggestions should NOT start with "Let me" or "I can"
      for (const t of turns) {
        for (const s of t.suggestions) {
          expect(s).not.toMatch(/^(Let me|I can|I'll|I will)/i);
        }
      }
    });

    it('later turns reference fintech/payments context', () => {
      // After turn 3 where user mentions fintech, subsequent turns should reflect it
      const laterText = turns.slice(2).map(t => t.bot.toLowerCase()).join(' ');
      expect(
        laterText.includes('fintech') ||
        laterText.includes('payment') ||
        laterText.includes('api') ||
        laterText.includes('startup')
      ).toBe(true);
    });

    it('final turn suggests clear next step (contact/form/call)', () => {
      const lastBot = turns[turns.length - 1].bot.toLowerCase();
      expect(
        lastBot.includes('contact') ||
        lastBot.includes('get in touch') ||
        lastBot.includes('reach out') ||
        lastBot.includes('schedule') ||
        lastBot.includes('consultation') ||
        lastBot.includes('get started')
      ).toBe(true);
    });
  });
});

// ── Non-B2B control test (ecommerce should NOT ask for URL) ──────────

describe.skipIf(!HAS_API_KEY)('Simulation: Non-B2B control — Ecommerce', () => {
  describe('Ecommerce store (should NOT trigger URL capture)', () => {
    let website: ScrapedWebsite;
    let systemPrompt: string;
    let turns: ConversationTurn[];

    beforeAll(async () => {
      // Use a known ecommerce site (glossier.com is verified reachable)
      website = await scrapeWebsite('https://www.glossier.com');

      systemPrompt = buildPromptForWebsite(website);

      // Only run conversation if site was successfully scraped
      if (website.pages.length > 0) {
        const chat = buildChat(systemPrompt);
        turns = await runConversation(chat, [
          "Hi, what products do you have?",
          "What's your most popular flavor?",
          "Do you ship internationally?",
        ]);
      } else {
        turns = [];
      }
    }, 120_000);

    it('detects business type as ecommerce or other (not b2b/services/saas)', () => {
      expect(['b2b', 'services', 'saas']).not.toContain(website.signals.businessType);
    });

    it('does NOT inject B2B Visitor Discovery section', () => {
      expect(systemPrompt).not.toContain('## Visitor Business Discovery');
    });

    it('never asks for visitor URL', () => {
      if (turns.length === 0) return; // skip if scrape failed
      const urlTurn = turns.find(t => t.urlAsked);
      expect(urlTurn).toBeUndefined();
    });
  });
});
