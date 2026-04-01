/**
 * Conversation Simulation Script
 *
 * Scrapes a website, builds the system prompt, and simulates a multi-turn
 * conversation with Gemini to verify bot behavior end-to-end.
 *
 * Usage:
 *   cd /Users/balencia/Documents/Code/runwell-bib
 *   GEMINI_API_KEY=<key> pnpm --filter @runwell/pidgie-core exec tsx \
 *     simulations/scripts/simulate-conversation.ts <url> [messages...]
 *
 * Examples:
 *   # With default messages (generic B2B prospect)
 *   GEMINI_API_KEY=<key> pnpm --filter @runwell/pidgie-core exec tsx \
 *     simulations/scripts/simulate-conversation.ts https://capvstrategies.com
 *
 *   # With custom messages
 *   GEMINI_API_KEY=<key> pnpm --filter @runwell/pidgie-core exec tsx \
 *     simulations/scripts/simulate-conversation.ts https://example.com \
 *     "What do you do?" "How much does it cost?" "Can I see a demo?"
 */

import { scrapeWebsite } from '../../src/scraper/index.js';
import { buildSystemPrompt } from '../../src/prompt/index.js';
import { buildSuggestionPromptFragment } from '../../src/suggestions/index.js';
import { getDefaultTone } from '../../src/detection/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY env var required');
  process.exit(1);
}

const DEFAULT_MESSAGES = [
  "Hi, what does your company do?",
  "That's interesting. We've been looking for something like this. How does it typically work?",
  "We're a mid-size company and we've been struggling with this. What would you recommend for us?",
  "What kind of results have your clients seen?",
  "How do we get started?",
];

// URL patterns to detect when bot asks for visitor's website
const URL_REQUEST_PATTERNS = [
  /your (?:website|url|site|link)/i,
  /share (?:your|the) (?:url|website|link|site)/i,
  /take a (?:look|quick look) at your (?:website|site)/i,
  /what(?:'s| is) your (?:website|url|site)/i,
  /send (?:me |us )?(?:your |the )?(?:url|website|link|site)/i,
  /company(?:'s)? (?:website|url|site)/i,
  /do you have a (?:website|url|site)/i,
];

async function main() {
  const args = process.argv.slice(2);
  const targetUrl = args[0];

  if (!targetUrl) {
    console.error('Usage: simulate-conversation.ts <url> [message1] [message2] ...');
    process.exit(1);
  }

  const userMessages = args.length > 1 ? args.slice(1) : DEFAULT_MESSAGES;

  // Step 1: Scrape
  console.log(`=== SCRAPING ${targetUrl} ===\n`);
  const website = await scrapeWebsite(targetUrl, (status, count) => {
    console.log(`  ${status} (${count} pages)`);
  });

  console.log(`\n  Business Name: ${website.businessName}`);
  console.log(`  Business Type: ${website.signals.businessType}`);
  console.log(`  Confidence: ${(website.signals.confidence * 100).toFixed(0)}%`);
  console.log(`  Has Services: ${website.signals.hasServices}`);
  console.log(`  Has Products: ${website.signals.hasProducts}`);
  console.log(`  Has Case Studies: ${website.signals.hasCaseStudies}`);
  console.log(`  Has Pricing: ${website.signals.hasPricing}`);
  console.log(`  Pages scraped: ${website.pages.length}`);

  // Step 2: Build system prompt
  const tone = getDefaultTone(website.signals.businessType);
  const systemPrompt =
    buildSystemPrompt(
      { website, config: { tone } },
      { maxContentLength: 8000 }
    ) +
    '\n\n' +
    buildSuggestionPromptFragment({ mode: 'pidgie', perspective: 'user-asks-bot' }).promptText;

  const hasB2B = systemPrompt.includes('## Visitor Business Discovery');
  console.log(`\n  Tone: ${tone}`);
  console.log(`  B2B Section Present: ${hasB2B}`);
  console.log(`  System Prompt Length: ${systemPrompt.length} chars`);

  // Step 3: Simulate conversation
  console.log('\n\n=== SIMULATED CONVERSATION ===\n');

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },
  });

  const chat = model.startChat({ history: [] });

  let urlAskedAtTurn = -1;
  const turns: Array<{ turn: number; user: string; bot: string; urlAsked: boolean; suggestions: string[] }> = [];

  for (let i = 0; i < userMessages.length; i++) {
    const userMsg = userMessages[i];
    console.log(`--- Turn ${i + 1} ---`);
    console.log(`USER: ${userMsg}\n`);

    const result = await chat.sendMessage(userMsg);
    const botResponse = result.response.text();
    console.log(`BOT: ${botResponse}\n`);

    // Detect URL request
    const askedForUrl = urlAskedAtTurn === -1 && URL_REQUEST_PATTERNS.some(p => p.test(botResponse));
    if (askedForUrl) {
      urlAskedAtTurn = i + 1;
      console.log(`  >>> URL REQUESTED AT TURN ${i + 1} <<<\n`);
    }

    // Extract suggestions
    const sugMatch = botResponse.match(/\[SUGGESTIONS?:\s*([^\]]+)\]/i);
    const suggestions = sugMatch
      ? sugMatch[1].split('|').map(s => s.trim()).filter(Boolean)
      : [];

    turns.push({ turn: i + 1, user: userMsg, bot: botResponse, urlAsked: askedForUrl, suggestions });
  }

  // Analysis
  console.log('\n=== ANALYSIS ===\n');
  console.log(`Website: ${targetUrl}`);
  console.log(`Business: ${website.businessName}`);
  console.log(`Business Type: ${website.signals.businessType}`);
  console.log(`B2B Section: ${hasB2B}`);
  console.log(`Total Turns: ${userMessages.length}`);

  if (hasB2B) {
    if (urlAskedAtTurn > 0) {
      console.log(`URL Asked at Turn: ${urlAskedAtTurn}`);
      if (urlAskedAtTurn === 1) {
        console.log(`VERDICT: FAIL — Bot asked for URL on FIRST message (violates "Build rapport first")`);
      } else if (urlAskedAtTurn <= 3) {
        console.log(`VERDICT: PASS — Bot asked for URL after ${urlAskedAtTurn} exchanges (within 2-3 range)`);
      } else {
        console.log(`VERDICT: WARN — Bot waited ${urlAskedAtTurn} turns (should ask within 2-3)`);
      }
    } else {
      console.log(`URL Never Asked in ${userMessages.length} turns`);
      console.log(`VERDICT: FAIL — B2B section present but bot never requested visitor's URL`);
    }
  } else {
    console.log(`B2B section not applicable for type "${website.signals.businessType}"`);
    console.log(`VERDICT: N/A — non-B2B business type, URL capture not expected`);
  }

  // Suggestions summary
  console.log('\nSuggestions per turn:');
  for (const t of turns) {
    if (t.suggestions.length > 0) {
      console.log(`  Turn ${t.turn}: ${t.suggestions.join(' | ')}`);
    } else {
      console.log(`  Turn ${t.turn}: (none detected)`);
    }
  }
}

main().catch(console.error);
