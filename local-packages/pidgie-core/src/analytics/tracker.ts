/**
 * Conversation Tracker
 *
 * Tracks and logs conversation data for analytics.
 */

import type { ConversationLog, MessageLog, ConversationMetrics } from './types.js';
import { TopicExtractor } from './topics.js';

/**
 * Tracker configuration
 */
export interface ConversationTrackerConfig {
  /** Business ID */
  businessId: string;
  /** Maximum content length to store */
  maxContentLength?: number;
  /** Storage callback */
  onSave?: (conversation: ConversationLog) => Promise<void>;
  /** Real-time callback */
  onMessage?: (message: MessageLog, conversationId: string) => void;
}

/**
 * Conversation Tracker class
 */
export class ConversationTracker {
  private config: ConversationTrackerConfig;
  private conversations: Map<string, ConversationLog> = new Map();
  private topicExtractor: TopicExtractor;

  constructor(config: ConversationTrackerConfig) {
    this.config = {
      maxContentLength: 500,
      ...config,
    };
    this.topicExtractor = new TopicExtractor();
  }

  /**
   * Start tracking a new conversation
   */
  startConversation(options: {
    sessionId: string;
    visitorId: string;
    userAgent?: string;
    ipHash?: string;
  }): string {
    const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const conversation: ConversationLog = {
      id,
      businessId: this.config.businessId,
      sessionId: options.sessionId,
      visitorId: options.visitorId,
      startedAt: new Date(),
      messageCount: 0,
      topics: [],
      userAgent: options.userAgent,
      ipHash: options.ipHash,
      metrics: {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        blockedMessages: 0,
        avgResponseTimeMs: 0,
        durationMs: 0,
        toolsUsed: [],
        topics: [],
      },
      messages: [],
    };

    this.conversations.set(id, conversation);
    return id;
  }

  /**
   * Log a message in a conversation
   */
  logMessage(
    conversationId: string,
    message: {
      role: 'user' | 'assistant';
      content: string;
      toolsUsed?: string[];
      blocked?: boolean;
      blockReason?: string;
      responseTimeMs?: number;
    }
  ): MessageLog | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    const messageLog: MessageLog = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: message.role,
      content: this.truncateContent(message.content),
      timestamp: new Date(),
      toolsUsed: message.toolsUsed,
      blocked: message.blocked,
      blockReason: message.blockReason,
      responseTimeMs: message.responseTimeMs,
    };

    conversation.messages.push(messageLog);
    conversation.messageCount++;

    // Update metrics
    conversation.metrics.totalMessages++;
    if (message.role === 'user') {
      conversation.metrics.userMessages++;

      // Extract topics from user messages
      const topics = this.topicExtractor.extractFromMessage(message.content);
      for (const topic of topics) {
        if (!conversation.topics.includes(topic.name)) {
          conversation.topics.push(topic.name);
          conversation.metrics.topics.push(topic.name);
        }
      }
    } else {
      conversation.metrics.assistantMessages++;

      // Track tools used
      if (message.toolsUsed) {
        for (const tool of message.toolsUsed) {
          if (!conversation.metrics.toolsUsed.includes(tool)) {
            conversation.metrics.toolsUsed.push(tool);
          }
        }
      }

      // Update average response time
      if (message.responseTimeMs) {
        const totalResponseTime =
          conversation.metrics.avgResponseTimeMs *
            (conversation.metrics.assistantMessages - 1) +
          message.responseTimeMs;
        conversation.metrics.avgResponseTimeMs = Math.round(
          totalResponseTime / conversation.metrics.assistantMessages
        );
      }
    }

    if (message.blocked) {
      conversation.metrics.blockedMessages++;
    }

    // Update duration
    conversation.metrics.durationMs =
      new Date().getTime() - conversation.startedAt.getTime();

    // Real-time callback
    if (this.config.onMessage) {
      this.config.onMessage(messageLog, conversationId);
    }

    return messageLog;
  }

  /**
   * End a conversation and save it
   */
  async endConversation(conversationId: string): Promise<ConversationLog | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    conversation.endedAt = new Date();
    conversation.metrics.durationMs =
      conversation.endedAt.getTime() - conversation.startedAt.getTime();

    // Detect sentiment from messages
    conversation.metrics.sentiment = this.detectSentiment(conversation.messages);

    // Save callback
    if (this.config.onSave) {
      await this.config.onSave(conversation);
    }

    // Remove from active tracking
    this.conversations.delete(conversationId);

    return conversation;
  }

  /**
   * Get a conversation
   */
  getConversation(conversationId: string): ConversationLog | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Get all active conversations
   */
  getActiveConversations(): ConversationLog[] {
    return Array.from(this.conversations.values());
  }

  /**
   * Get metrics for a conversation
   */
  getMetrics(conversationId: string): ConversationMetrics | null {
    const conversation = this.conversations.get(conversationId);
    return conversation?.metrics || null;
  }

  /**
   * Truncate content for storage
   */
  private truncateContent(content: string): string {
    const maxLength = this.config.maxContentLength || 500;
    if (content.length <= maxLength) {
      return content;
    }
    return content.slice(0, maxLength - 3) + '...';
  }

  /**
   * Simple sentiment detection based on keywords
   */
  private detectSentiment(
    messages: MessageLog[]
  ): 'positive' | 'neutral' | 'negative' {
    const positiveWords = [
      'thank', 'thanks', 'great', 'awesome', 'excellent', 'perfect',
      'love', 'amazing', 'wonderful', 'helpful', 'appreciate', 'good',
    ];
    const negativeWords = [
      'bad', 'terrible', 'awful', 'worst', 'hate', 'disappointed',
      'unhappy', 'frustrated', 'angry', 'poor', 'useless', 'annoying',
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const message of messages) {
      if (message.role !== 'user') continue;

      const words = message.content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (positiveWords.some((pw) => word.includes(pw))) {
          positiveScore++;
        }
        if (negativeWords.some((nw) => word.includes(nw))) {
          negativeScore++;
        }
      }
    }

    if (positiveScore > negativeScore + 1) return 'positive';
    if (negativeScore > positiveScore + 1) return 'negative';
    return 'neutral';
  }
}
