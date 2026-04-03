import * as react from 'react';
import { ChatWidgetTheme } from '../config/index.js';
import { CardConfig, ChatCard, ChatAction } from '@runwell/card-system/types';

interface ChatWidgetLabels {
    openChat?: string;
    closeChat?: string;
    sendMessage?: string;
    typePlaceholder?: string;
    /** Use ${seconds} for duration interpolation */
    recordingPlaceholder?: string;
    voiceInput?: string;
    stopRecording?: string;
    errorMessage?: string;
    transcribing?: string;
    minimize?: string;
    voiceEnabled?: string;
    voiceDisabled?: string;
    /** Label for image load error fallback in cards (default: 'Image unavailable') */
    imageUnavailable?: string;
    /** Label for the "load earlier" history button (default: 'Load earlier messages') */
    loadEarlier?: string;
    /** Label shown while loading history (default: 'Loading...') */
    loadingHistory?: string;
}
interface ChatWidgetProps {
    sessionId: string;
    businessName: string;
    theme: ChatWidgetTheme;
    /** Chat API path (default: /api/chat) */
    chatApiPath?: string;
    /** Voice API path (default: /api/chat/voice) */
    voiceApiPath?: string;
    /** Session API path for restoring messages on mount (e.g. /api/session). If set, GET {sessionApiPath}?id={sessionId} is called on mount to restore previous messages. */
    sessionApiPath?: string;
    /** Enable voice input (default: true) */
    enableVoice?: boolean;
    /** Initial suggestions shown in empty state */
    initialSuggestions?: string[];
    /** Label shown in header (default: "Assistant") */
    assistantLabel?: string;
    /** Powered-by text shown under name (default: "Powered by Runwell") */
    poweredByLabel?: string;
    /** Empty state message */
    emptyStateMessage?: string;
    /** Callback when user message count changes */
    onMessageCount?: (count: number) => void;
    /** Custom icon component for the assistant avatar (optional) */
    assistantIcon?: React.ReactNode;
    /** Custom icon component for the FAB (optional) */
    fabIcon?: React.ReactNode;
    /** i18n labels for UI strings (English defaults if omitted) */
    labels?: ChatWidgetLabels;
    /** Allow minimizing to preview card (default: true) */
    allowMinimize?: boolean;
    /** Clickable "Powered by" link at bottom of widget. Set to false to hide. Defaults to Runwell branding. */
    poweredByFooter?: {
        label: string;
        url: string;
    } | false;
    /** Card configuration override (defaults applied if omitted) */
    cardConfig?: Partial<CardConfig>;
    /** Card click handler override (default: open in new tab) */
    onCardClick?: (card: ChatCard) => void;
    /** Action handler override (default: navigate/message based on type) */
    onAction?: (action: ChatAction) => void;
    /** Enable cross-tab session sync via BroadcastChannel (default: false) */
    enableSync?: boolean;
    /** Render inline instead of portaling to document.body (default: false) */
    disablePortal?: boolean;
    /** Visitor ID for loading conversation history. Both visitorId and historyApiPath must be set. */
    visitorId?: string | null;
    /** History API path (e.g. /api/sales/history). Both visitorId and historyApiPath must be set. */
    historyApiPath?: string;
    /** Summarize API path for tab-close beacon (e.g. /api/sales/summarize). Sends sessionId on visibilitychange. */
    summarizeApiPath?: string;
    /** Extra fields to include in every chat API request body (e.g. tenantId, channel for public API) */
    chatApiExtraBody?: Record<string, unknown>;
    /** Extra headers to include in every chat API request (e.g. Authorization) */
    chatApiHeaders?: Record<string, string>;
    /** Language hint for voice transcription (BCP-47 code, e.g. "fr", "en"). Sent as FormData field. */
    voiceLanguageHint?: string;
    /** Callback fired after each chat API response with the parsed JSON. Used for language feedback loop. */
    onChatResponse?: (data: {
        reply: string;
        suggestions?: string[];
        detectedLocale?: string;
    }) => void;
    /**
     * Analytics event callback. Fires on card clicks, action clicks, and suggestion clicks.
     * Use this to send events to a bot-events ingestion endpoint.
     * Event shape: { eventType, entityType?, entityId?, entityName?, metadata }
     */
    onAnalyticsEvent?: (event: {
        eventType: string;
        entityType?: string;
        entityId?: string;
        entityName?: string;
        metadata?: Record<string, unknown>;
    }) => void;
}
declare function ChatWidget({ sessionId, businessName, theme, chatApiPath, voiceApiPath, sessionApiPath, enableVoice, initialSuggestions, assistantLabel, poweredByLabel, emptyStateMessage, onMessageCount, assistantIcon, fabIcon, labels, allowMinimize, poweredByFooter, cardConfig: cardConfigOverride, onCardClick: onCardClickProp, onAction: onActionProp, enableSync, disablePortal, visitorId, historyApiPath, summarizeApiPath, chatApiExtraBody, chatApiHeaders, voiceLanguageHint, onChatResponse, onAnalyticsEvent, }: ChatWidgetProps): react.ReactElement<unknown, string | react.JSXElementConstructor<any>> | null;

export { ChatWidget, type ChatWidgetLabels, type ChatWidgetProps };
