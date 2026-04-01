import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationRecord, MessageRecord, ToolCallRecord } from './types.js';

interface ConversationRow {
  id: string;
  visitor_id: string;
  session_id: string;
  source_app: string;
  metadata: Record<string, unknown>;
  message_count: number;
  sentiment_score: number | null;
  topics: string[] | null;
  intent: string | null;
  started_at: Date;
  last_message_at: Date;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tool_calls: ToolCallRecord[] | null;
  response_latency_ms: number | null;
  token_estimate: number | null;
  sentiment_score: number | null;
  created_at: Date;
}

function rowToConversation(row: ConversationRow): ConversationRecord {
  const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
  return {
    id: row.id,
    visitorId: row.visitor_id,
    sessionId: row.session_id,
    sourceApp: row.source_app,
    metadata: meta ?? {},
    messageCount: row.message_count,
    sentimentScore: row.sentiment_score ?? undefined,
    topics: row.topics ?? undefined,
    intent: row.intent ?? undefined,
    startedAt: new Date(row.started_at),
    lastMessageAt: new Date(row.last_message_at),
  };
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
    sentimentScore: row.sentiment_score ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export class ConversationStore {
  constructor(private pool: Pool) {}

  async create(
    visitorId: string,
    sessionId: string,
    sourceApp: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const id = uuidv4();
    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `INSERT INTO bot_conversations (id, visitor_id, session_id, source_app, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [id, visitorId, sessionId, sourceApp, JSON.stringify(metadata ?? {})]
    );
    return id;
  }

  async addMessage(
    conversationId: string,
    role: string,
    content: string,
    extras?: {
      toolCalls?: ToolCallRecord[];
      responseLatencyMs?: number;
      sentimentScore?: number;
    }
  ): Promise<string> {
    const id = uuidv4();
    const tokenEstimate = Math.ceil(content.length / 4);
    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `INSERT INTO bot_messages (id, conversation_id, role, content, tool_calls, response_latency_ms, token_estimate, sentiment_score)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
      [
        id,
        conversationId,
        role,
        content,
        extras?.toolCalls ? JSON.stringify(extras.toolCalls) : null,
        extras?.responseLatencyMs ?? null,
        tokenEstimate,
        extras?.sentimentScore ?? null,
      ]
    );

    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `UPDATE bot_conversations
       SET message_count = message_count + 1, last_message_at = NOW()
       WHERE id = $1`,
      [conversationId]
    );

    return id;
  }

  async getBySessionId(sessionId: string): Promise<ConversationRecord | null> {
    const result = await this.pool.query<ConversationRow>( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `SELECT * FROM bot_conversations WHERE session_id = $1`,
      [sessionId]
    );
    return result.rows[0] ? rowToConversation(result.rows[0]) : null;
  }

  async listByVisitor(visitorId: string, limit = 50, offset = 0): Promise<ConversationRecord[]> {
    const result = await this.pool.query<ConversationRow>( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `SELECT * FROM bot_conversations
       WHERE visitor_id = $1
       ORDER BY started_at DESC
       LIMIT $2 OFFSET $3`,
      [visitorId, limit, offset]
    );
    return result.rows.map(rowToConversation);
  }

  async getMessages(conversationId: string): Promise<MessageRecord[]> {
    const result = await this.pool.query<MessageRow>( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `SELECT * FROM bot_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return result.rows.map(rowToMessage);
  }

  async getWithMessages(conversationId: string): Promise<{
    conversation: ConversationRecord;
    messages: MessageRecord[];
  } | null> {
    const convResult = await this.pool.query<ConversationRow>( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `SELECT * FROM bot_conversations WHERE id = $1`,
      [conversationId]
    );
    if (!convResult.rows[0]) return null;

    const messages = await this.getMessages(conversationId);
    return {
      conversation: rowToConversation(convResult.rows[0]),
      messages,
    };
  }

  async updateMetadata(conversationId: string, partial: Record<string, unknown>): Promise<void> {
    await this.pool.query( // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
      `UPDATE bot_conversations SET metadata = metadata || $1::jsonb WHERE id = $2`,
      [JSON.stringify(partial), conversationId]
    );
  }

  async deleteOlderThan(days: number, geoRegion?: string): Promise<number> {
    let query = `
      DELETE FROM bot_conversations
      WHERE id IN (
        SELECT c.id FROM bot_conversations c
        JOIN bot_visitor_profiles v ON c.visitor_id = v.id
        WHERE c.last_message_at < NOW() - make_interval(days => $1)
    `;
    const params: (number | string)[] = [days];

    if (geoRegion) {
      query += ` AND v.geo_region = $2`;
      params.push(geoRegion);
    }

    query += `) RETURNING id`;

    const result = await this.pool.query(query, params); // nosemgrep: owasp-sql-injection -- parameterized query via pg Pool
    return result.rowCount ?? 0;
  }
}
