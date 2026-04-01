/**
 * SSE Streaming Types
 *
 * Type definitions for Server-Sent Events streaming.
 */

/**
 * SSE event types
 */
export type SSEEventType = 'text' | 'done' | 'error' | 'tool_call' | 'tool_result' | 'transcription' | 'suggestions' | 'metric' | 'cards' | 'actions' | 'panel_push' | 'panel_update';

/**
 * Base SSE event
 */
export interface SSEEvent {
  type: SSEEventType;
}

/**
 * Text chunk event
 */
export interface SSETextEvent extends SSEEvent {
  type: 'text';
  content: string;
}

/**
 * Stream completion event
 */
export interface SSEDoneEvent extends SSEEvent {
  type: 'done';
  /** Optional metadata about the completed stream */
  metadata?: {
    totalTokens?: number;
    durationMs?: number;
    toolsUsed?: string[];
    conversationId?: string;
  };
}

/**
 * Error event
 */
export interface SSEErrorEvent extends SSEEvent {
  type: 'error';
  content: string;
  /** Error code for client handling */
  code?: string;
}

/**
 * Tool call event (when agent calls a tool)
 */
export interface SSEToolCallEvent extends SSEEvent {
  type: 'tool_call';
  name: string;
  args: Record<string, unknown>;
}

/**
 * Tool result event (result of a tool call)
 */
export interface SSEToolResultEvent extends SSEEvent {
  type: 'tool_result';
  name: string;
  result: unknown;
}

/**
 * Transcription event (voice input transcribed to text)
 */
export interface SSETranscriptionEvent extends SSEEvent {
  type: 'transcription';
  /** Transcribed text from voice input */
  text: string;
  /** Detected language code */
  language?: string;
  /** Audio duration in seconds */
  duration?: number;
}

/**
 * Suggestions event (follow-up prompts after assistant response)
 */
export interface SSESuggestionsEvent extends SSEEvent {
  type: 'suggestions';
  suggestions: string[];
}

/**
 * Metric event (advisor sends computed metric data to context panel)
 */
export interface SSEMetricEvent extends SSEEvent {
  type: 'metric';
  metric: {
    id: string;
    label: string;
    value: number;
    formatted: string;
    unit: string;
    trend?: { direction: string; formatted: string };
    breakdown?: Array<{ label: string; formatted: string; percentage?: number }>;
  };
}

/**
 * Cards event — validated cards to render inline in chat
 */
export interface SSECardsEvent extends SSEEvent {
  type: 'cards';
  cards: Array<{
    type: string;
    id: string;
    data: Record<string, unknown>;
    source: {
      table: string;
      recordId: string;
      tenantId: string;
      validatedAt: number;
    };
  }>;
  renderMode: 'immediate' | 'progressive';
}

/**
 * Actions event — phase-appropriate pills below the message
 */
export interface SSEActionsEvent extends SSEEvent {
  type: 'actions';
  pills: Array<{
    type: 'action' | 'message';
    label: string;
    payload: Record<string, unknown>;
  }>;
}

/**
 * Panel push event — push an artifact to the side panel
 */
export interface SSEPanelPushEvent extends SSEEvent {
  type: 'panel_push';
  item: {
    id: string;
    cardType: string;
    title: string;
    content: Record<string, unknown>;
    pinned?: boolean;
  };
}

/**
 * Panel update event — update an existing panel item
 */
export interface SSEPanelUpdateEvent extends SSEEvent {
  type: 'panel_update';
  itemId: string;
  updates: Record<string, unknown>;
}

/**
 * Union of all SSE event types
 */
export type SSEEventUnion =
  | SSETextEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSEToolCallEvent
  | SSEToolResultEvent
  | SSETranscriptionEvent
  | SSESuggestionsEvent
  | SSEMetricEvent
  | SSECardsEvent
  | SSEActionsEvent
  | SSEPanelPushEvent
  | SSEPanelUpdateEvent;

/**
 * SSE stream options
 */
export interface SSEStreamOptions {
  /** Include keep-alive comments */
  keepAlive?: boolean;
  /** Keep-alive interval in milliseconds */
  keepAliveIntervalMs?: number;
  /** Custom headers to include */
  headers?: Record<string, string>;
}

/**
 * SSE response headers
 */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
} as const;
