/**
 * SSE Streaming Utilities
 *
 * Helper functions for Server-Sent Events streaming.
 */

import type {
  SSEEventUnion,
  SSETextEvent,
  SSEDoneEvent,
  SSEErrorEvent,
  SSEToolCallEvent,
  SSEToolResultEvent,
  SSEMetricEvent,
  SSECardsEvent,
  SSEActionsEvent,
  SSEPanelPushEvent,
  SSEPanelUpdateEvent,
  SSEStreamOptions,
} from './types.js';
import { SSE_HEADERS } from './types.js';

/**
 * Encode an SSE event to bytes
 */
export function encodeSSE(event: SSEEventUnion): Uint8Array {
  const encoder = new TextEncoder();
  const data = JSON.stringify(event);
  return encoder.encode(`data: ${data}\n\n`);
}

/**
 * Encode a text chunk event
 */
export function encodeTextChunk(content: string): Uint8Array {
  return encodeSSE({ type: 'text', content });
}

/**
 * Encode a done event
 */
export function encodeDone(metadata?: SSEDoneEvent['metadata']): Uint8Array {
  return encodeSSE({ type: 'done', metadata });
}

/**
 * Encode an error event
 */
export function encodeError(content: string, code?: string): Uint8Array {
  return encodeSSE({ type: 'error', content, code });
}

/**
 * Encode a tool call event
 */
export function encodeToolCall(name: string, args: Record<string, unknown>): Uint8Array {
  return encodeSSE({ type: 'tool_call', name, args });
}

/**
 * Encode a tool result event
 */
export function encodeToolResult(name: string, result: unknown): Uint8Array {
  return encodeSSE({ type: 'tool_result', name, result });
}

/**
 * Encode a suggestions event
 */
export function encodeSuggestions(suggestions: string[]): Uint8Array {
  return encodeSSE({ type: 'suggestions', suggestions });
}

/**
 * Encode a metric event (for advisor context panel)
 */
export function encodeMetric(metric: SSEMetricEvent['metric']): Uint8Array {
  return encodeSSE({ type: 'metric', metric });
}

/**
 * Encode a cards event (validated cards for inline display)
 */
export function encodeCards(cards: SSECardsEvent['cards'], renderMode: SSECardsEvent['renderMode'] = 'immediate'): Uint8Array {
  return encodeSSE({ type: 'cards', cards, renderMode });
}

/**
 * Encode an actions event (phase-appropriate pills)
 */
export function encodeActions(pills: SSEActionsEvent['pills']): Uint8Array {
  return encodeSSE({ type: 'actions', pills });
}

/**
 * Encode a panel push event
 */
export function encodePanelPush(item: SSEPanelPushEvent['item']): Uint8Array {
  return encodeSSE({ type: 'panel_push', item });
}

/**
 * Encode a panel update event
 */
export function encodePanelUpdate(itemId: string, updates: Record<string, unknown>): Uint8Array {
  return encodeSSE({ type: 'panel_update', itemId, updates });
}

/**
 * Encode a keep-alive comment
 */
export function encodeKeepAlive(): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(': keep-alive\n\n');
}

/**
 * Create SSE response headers
 */
export function createSSEHeaders(custom?: Record<string, string>): Headers {
  const headers = new Headers(SSE_HEADERS);
  if (custom) {
    for (const [key, value] of Object.entries(custom)) {
      headers.set(key, value);
    }
  }
  return headers;
}

/**
 * Create an SSE stream from an async generator
 */
export function createSSEStream<T>(
  generator: AsyncGenerator<T, void, unknown>,
  transform: (chunk: T) => SSEEventUnion | SSEEventUnion[],
  options?: SSEStreamOptions
): ReadableStream<Uint8Array> {
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream({
    async start(controller) {
      // Set up keep-alive if enabled
      if (options?.keepAlive) {
        const interval = options.keepAliveIntervalMs ?? 15000;
        keepAliveTimer = setInterval(() => {
          try {
            controller.enqueue(encodeKeepAlive());
          } catch {
            // Stream may be closed
          }
        }, interval);
      }

      try {
        for await (const chunk of generator) {
          const events = transform(chunk);
          const eventArray = Array.isArray(events) ? events : [events];

          for (const event of eventArray) {
            controller.enqueue(encodeSSE(event));
          }
        }

        // Send done event
        controller.enqueue(encodeDone());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        controller.enqueue(encodeError(message));
      } finally {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
        }
        controller.close();
      }
    },

    cancel() {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
      }
    },
  });
}

/**
 * Create an SSE response from a stream
 */
export function createSSEResponse(
  stream: ReadableStream<Uint8Array>,
  options?: SSEStreamOptions
): Response {
  return new Response(stream, {
    headers: createSSEHeaders(options?.headers),
  });
}

/**
 * Create a simple SSE stream that yields text chunks
 *
 * @example
 * ```typescript
 * const stream = createTextStream(async function* () {
 *   for await (const chunk of agent.chatStream(message)) {
 *     yield chunk;
 *   }
 * });
 * return createSSEResponse(stream);
 * ```
 */
export function createTextStream(
  generator: () => AsyncGenerator<string, void, unknown>,
  options?: SSEStreamOptions
): ReadableStream<Uint8Array> {
  return createSSEStream(
    generator(),
    (chunk) => ({ type: 'text', content: chunk } as SSETextEvent),
    options
  );
}

/**
 * SSE stream builder for more complex streaming scenarios
 *
 * @example
 * ```typescript
 * const { stream, writer } = createSSEWriter();
 *
 * // In your async code:
 * await writer.text('Hello');
 * await writer.text(' world');
 * await writer.toolCall('search', { query: 'test' });
 * await writer.done();
 *
 * return createSSEResponse(stream);
 * ```
 */
export function createSSEWriter(options?: SSEStreamOptions): {
  stream: ReadableStream<Uint8Array>;
  writer: {
    text: (content: string) => Promise<void>;
    error: (content: string, code?: string) => Promise<void>;
    toolCall: (name: string, args: Record<string, unknown>) => Promise<void>;
    toolResult: (name: string, result: unknown) => Promise<void>;
    suggestions: (suggestions: string[]) => Promise<void>;
    metric: (m: SSEMetricEvent['metric']) => Promise<void>;
    cards: (cards: SSECardsEvent['cards'], renderMode?: SSECardsEvent['renderMode']) => Promise<void>;
    actions: (pills: SSEActionsEvent['pills']) => Promise<void>;
    panelPush: (item: SSEPanelPushEvent['item']) => Promise<void>;
    panelUpdate: (itemId: string, updates: Record<string, unknown>) => Promise<void>;
    done: (metadata?: SSEDoneEvent['metadata']) => Promise<void>;
    close: () => void;
  };
} {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;

      // Set up keep-alive if enabled
      if (options?.keepAlive) {
        const interval = options.keepAliveIntervalMs ?? 15000;
        keepAliveTimer = setInterval(() => {
          if (closed) return;
          try {
            controller.enqueue(encodeKeepAlive());
          } catch {
            closed = true;
          }
        }, interval);
      }
    },

    cancel() {
      closed = true;
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
      }
    },
  });

  const enqueue = async (data: Uint8Array): Promise<void> => {
    if (closed) return;
    try { controller.enqueue(data); } catch { closed = true; }
  };

  const writer = {
    text: (content: string) => enqueue(encodeTextChunk(content)),
    error: (content: string, code?: string) => enqueue(encodeError(content, code)),
    toolCall: (name: string, args: Record<string, unknown>) => enqueue(encodeToolCall(name, args)),
    toolResult: (name: string, result: unknown) => enqueue(encodeToolResult(name, result)),
    suggestions: (suggestions: string[]) => enqueue(encodeSuggestions(suggestions)),
    metric: (m: SSEMetricEvent['metric']) => enqueue(encodeMetric(m)),
    cards: (cards: SSECardsEvent['cards'], renderMode?: SSECardsEvent['renderMode']) => enqueue(encodeCards(cards, renderMode)),
    actions: (pills: SSEActionsEvent['pills']) => enqueue(encodeActions(pills)),
    panelPush: (item: SSEPanelPushEvent['item']) => enqueue(encodePanelPush(item)),
    panelUpdate: (itemId: string, updates: Record<string, unknown>) => enqueue(encodePanelUpdate(itemId, updates)),
    done: (metadata?: SSEDoneEvent['metadata']) => enqueue(encodeDone(metadata)),
    close: () => {
      if (closed) return;
      closed = true;
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
      }
      try { controller.close(); } catch { /* already closed */ }
    },
  };

  return { stream, writer };
}
