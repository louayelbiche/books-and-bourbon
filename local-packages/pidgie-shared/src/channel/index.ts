/**
 * Channel Adapters
 *
 * Converts suggestions and responses to platform-specific formats.
 *
 * @example
 * ```typescript
 * import { suggestionsToWhatsApp } from '@runwell/pidgie-shared/channel';
 *
 * const interactive = suggestionsToWhatsApp(["Option A", "Option B"]);
 * // { type: 'button', buttons: [{ id: '0', title: 'Option A' }, ...] }
 * ```
 */

// WhatsApp interactive message types

export interface WhatsAppButton {
  type: 'reply';
  reply: { id: string; title: string };
}

export interface WhatsAppButtonMessage {
  type: 'button';
  body: { text: string };
  action: { buttons: WhatsAppButton[] };
}

export interface WhatsAppListItem {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppListMessage {
  type: 'list';
  body: { text: string };
  action: {
    button: string;
    sections: Array<{ title: string; rows: WhatsAppListItem[] }>;
  };
}

/**
 * Convert suggestions to WhatsApp interactive buttons (1-3 items)
 * or list message (4-10 items). Returns null for empty suggestions.
 */
export function suggestionsToWhatsApp(
  suggestions: string[],
  bodyText: string = 'How can I help?'
): WhatsAppButtonMessage | WhatsAppListMessage | null {
  if (!suggestions || suggestions.length === 0) return null;

  if (suggestions.length <= 3) {
    return {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: suggestions.map((s, i) => ({
          type: 'reply' as const,
          reply: { id: String(i), title: s.slice(0, 20) },
        })),
      },
    };
  }

  return {
    type: 'list',
    body: { text: bodyText },
    action: {
      button: 'Options',
      sections: [{
        title: 'Suggestions',
        rows: suggestions.slice(0, 10).map((s, i) => ({
          id: String(i),
          title: s.slice(0, 24),
          description: s.length > 24 ? s.slice(0, 72) : undefined,
        })),
      }],
    },
  };
}

/**
 * Channel-agnostic suggestion converter.
 * Web: returns suggestions as-is (string array).
 * WhatsApp: converts to interactive buttons/list.
 */
export function convertSuggestionsForChannel(
  suggestions: string[],
  channel: 'web' | 'whatsapp',
  bodyText?: string
): string[] | WhatsAppButtonMessage | WhatsAppListMessage | null {
  if (channel === 'web') return suggestions;
  return suggestionsToWhatsApp(suggestions, bodyText);
}
