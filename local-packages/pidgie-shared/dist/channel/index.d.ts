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
interface WhatsAppButton {
    type: 'reply';
    reply: {
        id: string;
        title: string;
    };
}
interface WhatsAppButtonMessage {
    type: 'button';
    body: {
        text: string;
    };
    action: {
        buttons: WhatsAppButton[];
    };
}
interface WhatsAppListItem {
    id: string;
    title: string;
    description?: string;
}
interface WhatsAppListMessage {
    type: 'list';
    body: {
        text: string;
    };
    action: {
        button: string;
        sections: Array<{
            title: string;
            rows: WhatsAppListItem[];
        }>;
    };
}
/**
 * Convert suggestions to WhatsApp interactive buttons (1-3 items)
 * or list message (4-10 items). Returns null for empty suggestions.
 */
declare function suggestionsToWhatsApp(suggestions: string[], bodyText?: string): WhatsAppButtonMessage | WhatsAppListMessage | null;
/**
 * Channel-agnostic suggestion converter.
 * Web: returns suggestions as-is (string array).
 * WhatsApp: converts to interactive buttons/list.
 */
declare function convertSuggestionsForChannel(suggestions: string[], channel: 'web' | 'whatsapp', bodyText?: string): string[] | WhatsAppButtonMessage | WhatsAppListMessage | null;

export { type WhatsAppButton, type WhatsAppButtonMessage, type WhatsAppListItem, type WhatsAppListMessage, convertSuggestionsForChannel, suggestionsToWhatsApp };
