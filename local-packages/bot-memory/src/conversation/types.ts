export interface ConversationRecord {
  id: string;
  visitorId: string;
  sessionId: string;
  sourceApp: string;
  metadata: Record<string, unknown>;
  messageCount: number;
  sentimentScore?: number;
  topics?: string[];
  intent?: string;
  startedAt: Date;
  lastMessageAt: Date;
}

/** Enriched tool call metadata. Backward compatible: old records may only have `name`. */
export interface ToolCallRecord {
  name: string;
  args?: Record<string, unknown>;
  success?: boolean;
  resultSummary?: string;
  durationMs?: number;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCallRecord[];
  responseLatencyMs?: number;
  tokenEstimate?: number;
  sentimentScore?: number;
  createdAt: Date;
}

export interface HistoryPage {
  messages: MessageRecord[];
  hasMore: boolean;
  oldestTimestamp: string | null;
}
