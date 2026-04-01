/**
 * Conversation Analytics Module
 *
 * Provides analytics and insights from customer conversations.
 */

export { ConversationTracker, type ConversationTrackerConfig } from './tracker.js';
export { TopicExtractor, type ExtractedTopic, TOPIC_CATEGORIES } from './topics.js';
export { ConversationAnalytics, type AnalyticsSummary, type DailyStats } from './aggregation.js';
export type { ConversationLog, MessageLog, ConversationMetrics } from './types.js';
