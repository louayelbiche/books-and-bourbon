/**
 * Conversation Analytics Aggregation
 *
 * Aggregates conversation data into summaries and daily statistics.
 */

import type { ConversationLog, ConversationMetrics } from './types.js';

/**
 * Daily statistics
 */
export interface DailyStats {
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Total conversations */
  totalConversations: number;
  /** Total messages */
  totalMessages: number;
  /** Unique visitors */
  uniqueVisitors: number;
  /** Average messages per conversation */
  avgMessagesPerConversation: number;
  /** Average conversation duration (ms) */
  avgDurationMs: number;
  /** Average response time (ms) */
  avgResponseTimeMs: number;
  /** Topic breakdown */
  topicCounts: Record<string, number>;
  /** Sentiment breakdown */
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
  };
  /** Blocked message count */
  blockedMessages: number;
  /** Tools usage */
  toolUsage: Record<string, number>;
  /** Peak hour (0-23) */
  peakHour: number;
  /** Hourly distribution */
  hourlyDistribution: number[];
}

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  /** Period start */
  periodStart: Date;
  /** Period end */
  periodEnd: Date;
  /** Total conversations */
  totalConversations: number;
  /** Total messages */
  totalMessages: number;
  /** Unique visitors */
  uniqueVisitors: number;
  /** Average messages per conversation */
  avgMessagesPerConversation: number;
  /** Average conversation duration (ms) */
  avgDurationMs: number;
  /** Average response time (ms) */
  avgResponseTimeMs: number;
  /** Top topics (sorted by count) */
  topTopics: Array<{ topic: string; count: number; percentage: number }>;
  /** Sentiment distribution */
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  /** Most used tools */
  topTools: Array<{ tool: string; count: number }>;
  /** Daily stats */
  dailyStats: DailyStats[];
  /** Engagement rate (conversations with 3+ user messages) */
  engagementRate: number;
  /** Resolution indicators */
  resolutionIndicators: {
    /** Conversations ending positively */
    positiveEndings: number;
    /** Conversations with escalation requests */
    escalationRequests: number;
  };
}

/**
 * Conversation Analytics class
 */
export class ConversationAnalytics {
  private businessId: string;

  constructor(businessId: string) {
    this.businessId = businessId;
  }

  /**
   * Generate daily stats from conversations
   */
  generateDailyStats(conversations: ConversationLog[], date: string): DailyStats {
    const dayConversations = conversations.filter((c) => {
      const convDate = c.startedAt.toISOString().split('T')[0];
      return convDate === date;
    });

    const uniqueVisitors = new Set(dayConversations.map((c) => c.visitorId)).size;
    const totalMessages = dayConversations.reduce((sum, c) => sum + c.messageCount, 0);
    const totalDuration = dayConversations.reduce((sum, c) => sum + c.metrics.durationMs, 0);
    const totalResponseTime = dayConversations.reduce(
      (sum, c) => sum + c.metrics.avgResponseTimeMs * c.metrics.assistantMessages,
      0
    );
    const totalAssistantMessages = dayConversations.reduce(
      (sum, c) => sum + c.metrics.assistantMessages,
      0
    );

    // Topic counts
    const topicCounts: Record<string, number> = {};
    for (const conv of dayConversations) {
      for (const topic of conv.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    // Sentiment counts
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    for (const conv of dayConversations) {
      const sentiment = conv.metrics.sentiment || 'neutral';
      sentimentCounts[sentiment]++;
    }

    // Blocked messages
    const blockedMessages = dayConversations.reduce(
      (sum, c) => sum + c.metrics.blockedMessages,
      0
    );

    // Tool usage
    const toolUsage: Record<string, number> = {};
    for (const conv of dayConversations) {
      for (const tool of conv.metrics.toolsUsed) {
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
      }
    }

    // Hourly distribution
    const hourlyDistribution = new Array(24).fill(0);
    for (const conv of dayConversations) {
      const hour = conv.startedAt.getHours();
      hourlyDistribution[hour]++;
    }

    // Peak hour
    let peakHour = 0;
    let maxCount = 0;
    for (let i = 0; i < 24; i++) {
      if (hourlyDistribution[i] > maxCount) {
        maxCount = hourlyDistribution[i];
        peakHour = i;
      }
    }

    return {
      date,
      totalConversations: dayConversations.length,
      totalMessages,
      uniqueVisitors,
      avgMessagesPerConversation:
        dayConversations.length > 0
          ? Math.round(totalMessages / dayConversations.length)
          : 0,
      avgDurationMs:
        dayConversations.length > 0
          ? Math.round(totalDuration / dayConversations.length)
          : 0,
      avgResponseTimeMs:
        totalAssistantMessages > 0
          ? Math.round(totalResponseTime / totalAssistantMessages)
          : 0,
      topicCounts,
      sentimentCounts,
      blockedMessages,
      toolUsage,
      peakHour,
      hourlyDistribution,
    };
  }

  /**
   * Generate analytics summary for a period
   */
  generateSummary(
    conversations: ConversationLog[],
    periodStart: Date,
    periodEnd: Date
  ): AnalyticsSummary {
    // Filter to period
    const periodConversations = conversations.filter((c) => {
      return c.startedAt >= periodStart && c.startedAt <= periodEnd;
    });

    const uniqueVisitors = new Set(periodConversations.map((c) => c.visitorId)).size;
    const totalMessages = periodConversations.reduce((sum, c) => sum + c.messageCount, 0);
    const totalDuration = periodConversations.reduce((sum, c) => sum + c.metrics.durationMs, 0);
    const totalResponseTime = periodConversations.reduce(
      (sum, c) => sum + c.metrics.avgResponseTimeMs * c.metrics.assistantMessages,
      0
    );
    const totalAssistantMessages = periodConversations.reduce(
      (sum, c) => sum + c.metrics.assistantMessages,
      0
    );

    // Topic counts
    const topicCounts: Record<string, number> = {};
    for (const conv of periodConversations) {
      for (const topic of conv.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    // Top topics
    const topTopics = Object.entries(topicCounts)
      .map(([topic, count]) => ({
        topic,
        count,
        percentage:
          periodConversations.length > 0
            ? Math.round((count / periodConversations.length) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Sentiment distribution
    const sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
    for (const conv of periodConversations) {
      const sentiment = conv.metrics.sentiment || 'neutral';
      sentimentDistribution[sentiment]++;
    }

    // Tool usage
    const toolUsage: Record<string, number> = {};
    for (const conv of periodConversations) {
      for (const tool of conv.metrics.toolsUsed) {
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
      }
    }

    // Top tools
    const topTools = Object.entries(toolUsage)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Engagement rate (conversations with 3+ user messages)
    const engagedConversations = periodConversations.filter(
      (c) => c.metrics.userMessages >= 3
    ).length;
    const engagementRate =
      periodConversations.length > 0
        ? Math.round((engagedConversations / periodConversations.length) * 100)
        : 0;

    // Resolution indicators
    const positiveEndings = periodConversations.filter(
      (c) => c.metrics.sentiment === 'positive'
    ).length;

    // Check for escalation keywords in last user message
    const escalationKeywords = ['human', 'person', 'manager', 'call', 'phone', 'email'];
    const escalationRequests = periodConversations.filter((c) => {
      const userMessages = c.messages.filter((m) => m.role === 'user');
      if (userMessages.length === 0) return false;
      const lastUserMessage = userMessages[userMessages.length - 1].content.toLowerCase();
      return escalationKeywords.some((kw) => lastUserMessage.includes(kw));
    }).length;

    // Generate daily stats
    const dailyStats: DailyStats[] = [];
    const currentDate = new Date(periodStart);
    while (currentDate <= periodEnd) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyStats.push(this.generateDailyStats(periodConversations, dateStr));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      periodStart,
      periodEnd,
      totalConversations: periodConversations.length,
      totalMessages,
      uniqueVisitors,
      avgMessagesPerConversation:
        periodConversations.length > 0
          ? Math.round(totalMessages / periodConversations.length)
          : 0,
      avgDurationMs:
        periodConversations.length > 0
          ? Math.round(totalDuration / periodConversations.length)
          : 0,
      avgResponseTimeMs:
        totalAssistantMessages > 0
          ? Math.round(totalResponseTime / totalAssistantMessages)
          : 0,
      topTopics,
      sentimentDistribution,
      topTools,
      dailyStats,
      engagementRate,
      resolutionIndicators: {
        positiveEndings,
        escalationRequests,
      },
    };
  }

  /**
   * Get summary for today
   */
  getTodaySummary(conversations: ConversationLog[]): DailyStats {
    const today = new Date().toISOString().split('T')[0];
    return this.generateDailyStats(conversations, today);
  }

  /**
   * Get summary for last N days
   */
  getLastNDaysSummary(conversations: ConversationLog[], days: number): AnalyticsSummary {
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    return this.generateSummary(conversations, periodStart, periodEnd);
  }

  /**
   * Get week-over-week comparison
   */
  getWeekOverWeekComparison(conversations: ConversationLog[]): {
    thisWeek: AnalyticsSummary;
    lastWeek: AnalyticsSummary;
    changes: {
      conversations: number;
      messages: number;
      visitors: number;
      engagementRate: number;
      avgResponseTime: number;
    };
  } {
    const now = new Date();

    // This week (last 7 days)
    const thisWeekEnd = now;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);

    // Last week (7-14 days ago)
    const lastWeekEnd = new Date(thisWeekStart);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisWeek = this.generateSummary(conversations, thisWeekStart, thisWeekEnd);
    const lastWeek = this.generateSummary(conversations, lastWeekStart, lastWeekEnd);

    // Calculate percentage changes
    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      thisWeek,
      lastWeek,
      changes: {
        conversations: calcChange(thisWeek.totalConversations, lastWeek.totalConversations),
        messages: calcChange(thisWeek.totalMessages, lastWeek.totalMessages),
        visitors: calcChange(thisWeek.uniqueVisitors, lastWeek.uniqueVisitors),
        engagementRate: calcChange(thisWeek.engagementRate, lastWeek.engagementRate),
        avgResponseTime: calcChange(thisWeek.avgResponseTimeMs, lastWeek.avgResponseTimeMs),
      },
    };
  }
}
