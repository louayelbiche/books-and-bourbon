"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Chat message type.
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Options for useChat hook.
 */
export interface UseChatOptions {
  /** Session ID for the chat */
  sessionId: string;
  /** Chat API endpoint (default: /api/chat) */
  endpoint?: string;
  /** Initial messages */
  initialMessages?: ChatMessage[];
  /** Error callback */
  onError?: (error: Error) => void;
  /** Generic error message shown to users */
  errorMessage?: string;
}

/**
 * Return type for useChat hook.
 */
export interface UseChatReturn {
  /** All messages in the chat */
  messages: ChatMessage[];
  /** Messages including streaming content for display */
  displayMessages: ChatMessage[];
  /** Whether a message is being sent/streamed */
  isLoading: boolean;
  /** Send a message */
  sendMessage: (content: string) => Promise<void>;
  /** Clear all messages */
  clearMessages: () => void;
  /** Current streaming content (partial message) */
  streamingContent: string;
  /** Abort the current request */
  abort: () => void;
  /** Follow-up suggestions from last assistant response */
  suggestions: string[];
}

/**
 * React hook for SSE-based chat functionality.
 *
 * Handles sending messages, streaming responses, and managing chat state.
 *
 * @example
 * ```tsx
 * const { displayMessages, isLoading, sendMessage } = useChat({
 *   sessionId: 'session-123',
 *   endpoint: '/api/chat',
 * });
 *
 * return (
 *   <div>
 *     {displayMessages.map((msg, i) => (
 *       <div key={i}>{msg.content}</div>
 *     ))}
 *     <button onClick={() => sendMessage('Hello!')}>Send</button>
 *   </div>
 * );
 * ```
 */
export function useChat({
  sessionId,
  endpoint = "/api/chat",
  initialMessages = [],
  onError,
  errorMessage = "I encountered an error.",
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoading || !content.trim()) return;

      // Abort any existing request
      abort();
      abortControllerRef.current = new AbortController();

      const userMessage: ChatMessage = { role: "user", content: content.trim() };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent("");
      setSuggestions([]);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: content.trim() }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text") {
                  accumulatedContent += data.content;
                  setStreamingContent(accumulatedContent);
                } else if (data.type === "suggestions") {
                  setSuggestions(data.suggestions || []);
                } else if (data.type === "done") {
                  // Strip suggestion tag that may have flashed during streaming
                  const cleanContent = accumulatedContent.replace(/\[SUGGESTIONS?:\s*[^\]]+\]\s*$/i, "").trimEnd();
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: cleanContent },
                  ]);
                  setStreamingContent("");
                } else if (data.type === "error") {
                  // Never expose internal error details to users
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: errorMessage },
                  ]);
                  setStreamingContent("");
                  setIsLoading(false);
                  return;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // Request was aborted, don't show error
          return;
        }
        console.error("Chat error:", error);
        // Never expose internal error details to users
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMessage },
        ]);
        setStreamingContent("");
        onError?.(error instanceof Error ? error : new Error("An error occurred"));
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, endpoint, isLoading, onError, errorMessage, abort]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
  }, []);

  // Combine messages with streaming content for display
  const displayMessages: ChatMessage[] = streamingContent
    ? [...messages, { role: "assistant", content: streamingContent }]
    : messages;

  return {
    messages,
    displayMessages,
    isLoading,
    sendMessage,
    clearMessages,
    streamingContent,
    abort,
    suggestions,
  };
}
