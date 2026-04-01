/**
 * SSE Streaming Module
 *
 * Server-Sent Events streaming utilities for real-time chat responses.
 *
 * @example
 * ```typescript
 * import {
 *   createTextStream,
 *   createSSEResponse,
 *   createSSEWriter,
 * } from '@runwell/pidgie-core/streaming';
 *
 * // Simple text streaming
 * export async function POST(request: Request) {
 *   const stream = createTextStream(async function* () {
 *     for await (const chunk of agent.chatStream(message)) {
 *       yield chunk;
 *     }
 *   });
 *   return createSSEResponse(stream);
 * }
 *
 * // Advanced streaming with tool calls
 * export async function POST(request: Request) {
 *   const { stream, writer } = createSSEWriter();
 *
 *   // Handle streaming in background
 *   (async () => {
 *     try {
 *       for await (const event of agent.streamWithTools(message)) {
 *         if (event.type === 'text') {
 *           await writer.text(event.content);
 *         } else if (event.type === 'tool_call') {
 *           await writer.toolCall(event.name, event.args);
 *         }
 *       }
 *       await writer.done();
 *     } catch (error) {
 *       await writer.error(error.message);
 *     } finally {
 *       writer.close();
 *     }
 *   })();
 *
 *   return createSSEResponse(stream);
 * }
 * ```
 */

// Encoding utilities
export {
  encodeSSE,
  encodeTextChunk,
  encodeDone,
  encodeError,
  encodeToolCall,
  encodeToolResult,
  encodeSuggestions,
  encodeMetric,
  encodeCards,
  encodeActions,
  encodePanelPush,
  encodePanelUpdate,
  encodeKeepAlive,
} from './sse.js';

// Stream creation
export {
  createSSEStream,
  createSSEResponse,
  createTextStream,
  createSSEWriter,
  createSSEHeaders,
} from './sse.js';

// Types
export type {
  SSEEventType,
  SSEEvent,
  SSETextEvent,
  SSEDoneEvent,
  SSEErrorEvent,
  SSEToolCallEvent,
  SSEToolResultEvent,
  SSETranscriptionEvent,
  SSESuggestionsEvent,
  SSEMetricEvent,
  SSECardsEvent,
  SSEActionsEvent,
  SSEPanelPushEvent,
  SSEPanelUpdateEvent,
  SSEEventUnion,
  SSEStreamOptions,
} from './types.js';

// Constants
export { SSE_HEADERS } from './types.js';
