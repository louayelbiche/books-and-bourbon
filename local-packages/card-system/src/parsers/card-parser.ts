import type { ChatCard, ChatAction, CardType, ActionType, StructuredChatResponse } from '../types.js';

/**
 * Enforce URL origin policy on parsed cards.
 * - Relative URLs (starting with / or no protocol) → always allowed (same-origin)
 * - Absolute URLs → must match one of allowedOrigins
 * - Cards with blocked URLs → url cleared to '', image cleared to undefined
 * - Also applies to action payloads where type === 'navigate'
 */
export function enforceUrlPolicy(
  cards: ChatCard[],
  allowedOrigins: string[]
): ChatCard[] {
  return cards.map((card) => ({
    ...card,
    url: isAllowedUrl(card.url, allowedOrigins) ? card.url : '',
    // Images are display-only content (not navigation targets).
    // sanitizeUrl() already blocks javascript:/data:/vbscript: in validateCards.
  }));
}

/**
 * Apply URL origin policy to action payloads (navigate type only).
 */
export function enforceActionUrlPolicy(
  actions: ChatAction[],
  allowedOrigins: string[]
): ChatAction[] {
  return actions.map((action) => {
    if (action.type !== 'navigate' || typeof action.payload !== 'string') return action;
    return {
      ...action,
      payload: isAllowedUrl(action.payload, allowedOrigins) ? action.payload : '',
    };
  });
}

function isAllowedUrl(url: string, allowedOrigins: string[]): boolean {
  if (!url) return true; // empty/null is safe
  // Relative URLs are always allowed
  if (url.startsWith('/') || (!url.includes('://') && !url.startsWith('//'))) return true;
  try {
    const resolved = url.startsWith('//') ? `https:${url}` : url;
    const hostname = new URL(resolved).hostname;
    return allowedOrigins.some((origin) => hostname === origin || hostname.endsWith(`.${origin}`));
  } catch {
    return false; // malformed URL → block
  }
}

const CARDS_TAG_REGEX = /\[CARDS\]\s*([\s\S]*?)\s*\[\/CARDS\]/i;
const ACTIONS_TAG_REGEX = /\[ACTIONS\]\s*([\s\S]*?)\s*\[\/ACTIONS\]/i;
const SUGGESTIONS_TAG_REGEX = /\[SUGGESTIONS?:\s*([^\]]+)\]\s*$/i;

const VALID_CARD_TYPES = new Set<CardType>(['product', 'service', 'page', 'event']);
const VALID_ACTION_TYPES = new Set<ActionType>(['navigate', 'message', 'api_call']);
const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:']);

/** Strip HTML tags from a string — defense-in-depth against LLM injecting markup. */
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/** Sanitize a URL: only allow http/https protocols. Returns empty string for dangerous URLs. */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  try {
    // Handle protocol-relative URLs
    const resolved = url.startsWith('//') ? `https:${url}` : url;
    const parsed = new URL(resolved);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol) ? url : '';
  } catch {
    // Relative URLs or malformed — keep as-is if they don't contain dangerous protocols
    const lower = url.toLowerCase().replace(/[\s\x00-\x1f]/g, '');
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
      return '';
    }
    return url;
  }
}

/** Max subtitle length — anything longer is likely a description misplaced as subtitle. */
const MAX_SUBTITLE_LENGTH = 60;

/** Normalize a subtitle: sanitize, and replace overlong descriptions with a generic fallback. */
function normalizeSubtitle(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const cleaned = stripHtmlTags(raw.trim());
  if (!cleaned) return undefined;
  if (cleaned.length > MAX_SUBTITLE_LENGTH) return 'Price not listed';
  return cleaned;
}

/** Validate and sanitize parsed card JSON — drops invalid entries, coerces missing fields. */
function validateCards(raw: unknown[]): ChatCard[] {
  return raw
    .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object')
    .filter((c) => typeof c.title === 'string' && c.title.trim().length > 0)
    .map((c) => ({
      id: typeof c.id === 'string' && c.id ? c.id : `card-${crypto.randomUUID()}`,
      type: (VALID_CARD_TYPES.has(c.type as CardType) ? c.type : 'product') as CardType,
      title: stripHtmlTags((c.title as string).trim()),
      image: typeof c.image === 'string' && c.image.trim() ? sanitizeUrl(c.image.trim()) || undefined : undefined,
      subtitle: normalizeSubtitle(c.subtitle),
      description: typeof c.description === 'string' ? stripHtmlTags(c.description as string) : undefined,
      url: typeof c.url === 'string' ? sanitizeUrl(c.url) : '',
      availability: (['available', 'low_stock', 'sold_out'].includes(c.availability as string) ? c.availability : 'available') as ChatCard['availability'],
      variants: Array.isArray(c.variants) ? c.variants : undefined,
      metadata: typeof c.metadata === 'object' && c.metadata !== null ? c.metadata as Record<string, unknown> : undefined,
      generatedAt: typeof c.generatedAt === 'number' ? c.generatedAt : Date.now(),
    }));
}

/**
 * Parse a raw AI response into structured parts: text, cards, actions, suggestions.
 * Extracts [CARDS]...[/CARDS], [ACTIONS]...[/ACTIONS], and [SUGGESTIONS:...] tags.
 * If no tags are found, returns the original text with empty arrays — backward compatible.
 */
export function parseStructuredResponse(rawText: string): StructuredChatResponse {
  let text = rawText;
  let cards: ChatCard[] = [];
  let actions: ChatAction[] = [];
  let suggestions: string[] = [];

  // Extract cards
  const cardsMatch = text.match(CARDS_TAG_REGEX);
  if (cardsMatch) {
    text = text.replace(CARDS_TAG_REGEX, '').trim();
    try {
      const parsed = JSON.parse(cardsMatch[1]);
      cards = Array.isArray(parsed) ? validateCards(parsed) : [];
    } catch {
      cards = [];
    }
  }

  // Extract actions
  const actionsMatch = text.match(ACTIONS_TAG_REGEX);
  if (actionsMatch) {
    text = text.replace(ACTIONS_TAG_REGEX, '').trim();
    try {
      const parsed = JSON.parse(actionsMatch[1]);
      actions = Array.isArray(parsed)
        ? (parsed as ChatAction[])
            .filter((a) => VALID_ACTION_TYPES.has(a.type))
            .map((a) => ({
              ...a,
              label: typeof a.label === 'string' ? stripHtmlTags(a.label) : '',
              payload: typeof a.payload === 'string' && a.type === 'navigate'
                ? sanitizeUrl(a.payload)
                : (typeof a.payload === 'string' ? a.payload : ''),
            }))
        : [];
    } catch {
      actions = [];
    }
  }

  // Extract suggestions (existing pattern from pidgie-core)
  const suggestionsMatch = text.match(SUGGESTIONS_TAG_REGEX);
  if (suggestionsMatch) {
    text = text.replace(SUGGESTIONS_TAG_REGEX, '').trim();
    suggestions = suggestionsMatch[1]
      .split('|')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  return { text, cards, actions, suggestions };
}
