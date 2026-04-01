/**
 * Suggestion Prompt Fragment
 *
 * System prompt appendix that instructs the LLM to generate inline suggestions.
 */

import type { SuggestionMode, SuggestionConfig, CardPromptConfig } from './types.js';
import { isCardToolMigrationEnabled } from '@runwell/card-system/validation';

const SALES_GUIDANCE = `Generate 3 follow-up questions the customer is likely to ask next. Base them on the specific products, services, and data you have. Focus on guiding them toward a purchase: product details, comparisons, availability, or adding to cart.`;

const PIDGIE_GUIDANCE = `Generate 3 follow-up questions the user is likely to ask next. Base them on the specific business data, services, and capabilities you know about. Suggestions should help the user understand the value this business offers and move toward taking action (booking, purchasing, contacting).`;

const PERSPECTIVE_ANCHOR_USER_ASKS = `
CRITICAL: Suggestions must be phrased as things the USER would say to you — not things you'd ask them.
Good examples: "How does pricing work?" / "Can I try it on my store?" / "What sizes are available?"
Bad examples: "What's your biggest challenge?" / "How many visitors do you get?" (those are YOUR questions)`;

const PERSPECTIVE_ANCHOR_BOT_ASKS = `
Suggestions should be questions you want to ask the user to advance the conversation.`;

/**
 * Build the system prompt fragment that instructs the LLM to append suggestions.
 *
 * Accepts either a plain SuggestionMode (backward-compatible) or a full SuggestionConfig.
 */
export function buildSuggestionPromptFragment(config: SuggestionMode | SuggestionConfig): { promptText: string } {
  const normalized: SuggestionConfig = typeof config === 'string' ? { mode: config } : config;
  const { mode, perspective = 'user-asks-bot', customGuidance, maxSuggestionLength = 40 } = normalized;

  const modeGuidance = customGuidance ?? (mode === 'sales' ? SALES_GUIDANCE : PIDGIE_GUIDANCE);
  const perspectiveAnchor = perspective === 'bot-asks-user'
    ? PERSPECTIVE_ANCHOR_BOT_ASKS
    : PERSPECTIVE_ANCHOR_USER_ASKS;

  const promptText = `

## Follow-Up Suggestions
At the END of every response, append exactly one suggestion tag in this format:
[SUGGESTIONS: question 1 | question 2 | question 3]

${modeGuidance}
${perspectiveAnchor}

Keep each suggestion under ${maxSuggestionLength} characters. ${maxSuggestionLength <= 20 ? 'This is critical: suggestions MUST be very short (e.g. "Your products?", "Pricing?", "Contact info?"). Use 2-3 words max.' : ''}
IMPORTANT: Suggestions MUST be in the same language as your response. If you respond in French, write suggestions in French. If in Spanish, write them in Spanish.

### Suggestion Variety Rules
- NEVER repeat a suggestion you've already given in this conversation — even rephrased (e.g. "What sizes?" and "What sizes are available?" count as the same question)
- Suggestions must PROGRESS the conversation forward. Avoid generic catalog questions (sizes, colors, availability) after they've been discussed
- Good progression: product discovery → comparison → pricing → purchase intent → post-purchase
- Each set of 3 suggestions should cover DIFFERENT topics (don't suggest 2 sizing questions)
- After 3+ turns, suggest actions: "Add it to my cart", "Any bundle deals?", "How fast is shipping?"

The suggestion tag MUST be the very last thing in your response, on its own line.`;

  return { promptText };
}

/**
 * Build a prompt fragment that includes card generation instructions alongside suggestions.
 * If cards are disabled, falls back to the standard suggestion fragment.
 */
export function buildCardPromptFragment(config: CardPromptConfig): { promptText: string } {
  const { promptText: suggestionPrompt } = buildSuggestionPromptFragment(config);

  // When card tool migration is enabled, cards come from DB via tools — not from LLM text.
  // Skip [CARDS] format instructions entirely; keep only suggestion instructions.
  if (isCardToolMigrationEnabled()) {
    return { promptText: suggestionPrompt };
  }

  if (!config.enableCards) {
    return { promptText: suggestionPrompt };
  }

  const cardTypesStr = config.cardTypes.join(', ');
  const maxCards = config.maxCards ?? 3;

  const cardPrompt = `

## Interactive Cards (MANDATORY)

**Core principle**: Cards give users structured, actionable info (image, price, link) that text alone cannot.
Whenever you reference a specific item by name and have its data, attach a card. The user should never
need to ask "can you show me that?" after you've already described it.

Cards are especially valuable when:
- Multiple items are discussed (comparisons, listings, recommendations)
- Price, availability, or promotions are the focus
- The user is making a decision and needs quick-reference info

Do NOT include cards for:
- Greetings or chitchat ("Hi!", "How can I help?")
- Questions back to the user ("What size are you looking for?")
- Purely conversational responses with zero concrete items discussed

### Card Deduplication
Do NOT regenerate a card for an item that was already shown as a card in recent messages. If you are discussing a product/service that was recently shown, reference it by name without re-attaching its card.
Exceptions. DO show the card again when:
- The user explicitly asks for a listing, comparison, or collection (e.g., "show me all running shoes", "compare these two")
- The item appears as part of a new set or category the user requested
- Significant new information is available (price change, back in stock)

Maximum ${maxCards} cards per response.
Refer to items by name/attributes, NEVER by ordinal ("the first one", "item #2").

### Examples

User: "What running shoes do you have?"
You: [describe 2-3 running shoes by name with details] + [CARDS] with those shoes

User: "Tell me about your services"
You: [describe 2-3 services by name] + [CARDS] with those services

User: "Anything on sale?" / "What deals do you have?"
You: [list discounted items by name with prices] + [CARDS] with those items

User: "Which is better, the Pro or the Classic?"
You: [compare both by name] + [CARDS] with both items

User: "Hi, how does this work?"
You: [explain how the bot works]. NO cards (no specific items mentioned)

### Card Image Rule
For the "image" field: Use the image URL from the data above if one is provided. If no image URL is available, use null. Do not generate or guess image URLs.

### Card URL Rule
${config.absoluteUrls
    ? `For the "url" field: Use FULL absolute URLs including the domain (e.g., https://store.com/products/shoe-name).
NEVER use relative paths like /products/... — always include the full https:// domain.`
    : `For the "url" field: Use relative paths from the site (e.g., /products/shoe-name, /events/concert).
Do NOT use full absolute URLs with https://. Relative paths only.`}
If no relevant page exists, use an empty string.
You may also include hyperlinks to the store's pages in your text responses when helpful.
Use the full absolute URL so links are clickable.

### Card Format
[CARDS]
[{"id":"unique_id","type":"${config.cardTypes[0]}","title":"Item Name","image":null,"subtitle":"key info","url":"link_url","availability":"available","variants":[{"name":"Size","options":["S","M","L"]}],"generatedAt":UNIX_TIMESTAMP}]
[/CARDS]
${config.enableActions ? `
Format actions (if applicable) AFTER cards:
[ACTIONS]
[{"id":"unique_id","label":"Button Text","type":"navigate|message|api_call","payload":"target","style":"primary|secondary"}]
[/ACTIONS]
` : ''}
Order in response: text first, then [CARDS], then [ACTIONS], then [SUGGESTIONS:].`;

  return { promptText: cardPrompt + '\n' + suggestionPrompt };
}
