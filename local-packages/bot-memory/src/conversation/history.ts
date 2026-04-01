import type { Pool } from 'pg';
import type { HistoryPage, MessageRecord } from './types.js';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls: { name: string }[] | null;
  response_latency_ms: number | null;
  token_estimate: number | null;
  created_at: Date;
}

function rowToMessage(row: MessageRow): MessageRecord {
  const toolCalls = typeof row.tool_calls === 'string'
    ? JSON.parse(row.tool_calls)
    : row.tool_calls;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as MessageRecord['role'],
    content: row.content,
    toolCalls: toolCalls ?? undefined,
    responseLatencyMs: row.response_latency_ms ?? undefined,
    tokenEstimate: row.token_estimate ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export class HistoryLoader {
  constructor(private pool: Pool) {}

  async getHistory(
    visitorId: string,
    options?: {
      before?: string;
      limit?: number;
      sourceApp?: string;
    }
  ): Promise<HistoryPage> {
    const limit = options?.limit ?? 20;
    const fetchLimit = limit + 1;

    const conditions: string[] = ['c.visitor_id = $1'];
    const params: (string | number)[] = [visitorId];
    let paramIdx = 2;

    if (options?.before) {
      conditions.push(`m.created_at < $${paramIdx}::timestamptz`);
      params.push(options.before);
      paramIdx++;
    }

    if (options?.sourceApp) {
      conditions.push(`c.source_app = $${paramIdx}`);
      params.push(options.sourceApp);
      paramIdx++;
    }

    params.push(fetchLimit);

    const result = await this.pool.query<MessageRow>(
      `SELECT m.* FROM bot_messages m
       JOIN bot_conversations c ON m.conversation_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.created_at DESC
       LIMIT $${paramIdx}`,
      params
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const messages = rows.map(rowToMessage);

    return {
      messages,
      hasMore,
      oldestTimestamp: messages.length > 0
        ? messages[messages.length - 1].createdAt.toISOString()
        : null,
    };
  }
}
