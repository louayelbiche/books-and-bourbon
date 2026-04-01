/**
 * Social Agent Card Types
 *
 * Card interfaces for the Social (LinkedIn) agent.
 * Source tables: LinkedInGeneration, LinkedInPost.
 */

import type { ValidatedCard } from '../types.js';

/**
 * Brand analysis card — shows extracted brand identity and content strategy.
 * Displayed after analyze_brand tool completes.
 */
export interface BrandAnalysisCardData extends Record<string, unknown> {
  companyName: string;
  tone: string;
  contentTypes: string[];
  targetAudience?: string;
  industry?: string;
  competitorInsights?: string[];
}

export interface BrandAnalysisCard extends ValidatedCard {
  type: 'brand-analysis';
  data: BrandAnalysisCardData;
}

/**
 * Social post card — inline preview of a single LinkedIn post.
 * Shows day badge, content preview, hashtags, and character count.
 */
export interface SocialPostCardData extends Record<string, unknown> {
  day: string;
  dayNumber: number;
  content: string;
  hashtags: string[];
  characterCount: number;
  scheduledTime?: string;
  contentType?: string;
}

export interface SocialPostCard extends ValidatedCard {
  type: 'social-post';
  data: SocialPostCardData;
}

/**
 * LinkedIn preview card — full LinkedIn post mockup in side panel.
 * Shows the post as it would appear on LinkedIn.
 */
export interface LinkedInPreviewCardData extends Record<string, unknown> {
  content: string;
  authorName: string;
  authorTitle: string;
  authorAvatar?: string;
  hashtags: string[];
  characterCount: number;
  day: string;
}

export interface LinkedInPreviewCard extends ValidatedCard {
  type: 'linkedin-preview';
  data: LinkedInPreviewCardData;
}

/**
 * Week overview card — aggregation of 7 LinkedIn posts.
 * Shows the complete weekly content plan at a glance.
 */
export interface WeekOverviewCardData extends Record<string, unknown> {
  posts: Array<{
    day: string;
    dayNumber: number;
    contentType: string;
    preview: string;
    characterCount: number;
  }>;
  totalPosts: number;
  totalCharacters: number;
  generationId: string;
}

export interface WeekOverviewCard extends ValidatedCard {
  type: 'week-overview';
  data: WeekOverviewCardData;
}
