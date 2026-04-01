/**
 * Social Agent Card Mappers
 *
 * Maps DB records from LinkedInGeneration and LinkedInPost tables
 * to validated Social card types.
 */

import { registerCardMapper } from '../build-card.js';

/** Matches Prisma LinkedInGeneration record */
interface BrandAnalysisRecord {
  id: string;
  companyName?: string | null;
  tone: string;
  postType: string;
  industry?: string | null;
  analysisJson?: Record<string, unknown> | null;
}

const DAY_NUMBER: Record<string, number> = {
  Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
  Friday: 5, Saturday: 6, Sunday: 7,
};

interface SocialPostRecord {
  id: string;
  dayOfWeek: string;
  theme: string;
  content: string;
  hashtags: string[];
  characterCount: number;
  suggestedTime?: string;
}

interface LinkedInPreviewRecord {
  id: string;
  content: string;
  hashtags: string[];
  characterCount: number;
  dayOfWeek: string;
  theme: string;
  generation?: {
    companyName?: string | null;
    tone: string;
  } | null;
}

/** Matches Prisma LinkedInGeneration with { include: { posts: true } } */
interface WeekOverviewRecord {
  id: string;
  companyName?: string | null;
  tone: string;
  postType: string;
  posts: Array<{
    dayOfWeek: string;
    theme: string;
    content: string;
    characterCount: number;
  }>;
}

export function registerSocialCardMappers(): void {
  registerCardMapper<BrandAnalysisRecord>('brand-analysis', (record, tenantId) => {
    const analysis = record.analysisJson as Record<string, unknown> | null;
    return {
      type: 'brand-analysis',
      id: record.id,
      data: {
        companyName: record.companyName || '',
        tone: record.tone,
        contentTypes: analysis?.contentTypes as string[] || [record.postType],
        targetAudience: analysis?.targetAudience as string || undefined,
        industry: record.industry || undefined,
        competitorInsights: analysis?.competitorInsights as string[] || undefined,
      },
      source: {
        table: 'LinkedInGeneration',
        recordId: record.id,
        tenantId,
        validatedAt: Date.now(),
      },
    };
  });

  registerCardMapper<SocialPostRecord>('social-post', (record, tenantId) => ({
    type: 'social-post',
    id: record.id,
    data: {
      day: record.dayOfWeek,
      dayNumber: DAY_NUMBER[record.dayOfWeek] ?? 0,
      content: record.content,
      hashtags: record.hashtags,
      characterCount: record.characterCount,
      scheduledTime: record.suggestedTime,
      contentType: record.theme,
    },
    source: {
      table: 'LinkedInPost',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<LinkedInPreviewRecord>('linkedin-preview', (record, tenantId) => ({
    type: 'linkedin-preview',
    id: record.id,
    data: {
      content: record.content,
      authorName: record.generation?.companyName || '',
      authorTitle: record.generation?.tone ? `${record.generation.tone} voice` : '',
      hashtags: record.hashtags,
      characterCount: record.characterCount,
      day: record.dayOfWeek,
    },
    source: {
      table: 'LinkedInPost',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<WeekOverviewRecord>('week-overview', (record, tenantId) => {
    const totalCharacters = record.posts.reduce((sum, p) => sum + p.characterCount, 0);
    return {
      type: 'week-overview',
      id: record.id,
      data: {
        posts: record.posts.map((p, i) => ({
          day: p.dayOfWeek,
          dayNumber: DAY_NUMBER[p.dayOfWeek] ?? (i + 1),
          contentType: p.theme,
          preview: p.content.substring(0, 80),
          characterCount: p.characterCount,
        })),
        totalPosts: record.posts.length,
        totalCharacters,
        generationId: record.id,
      },
      source: {
        table: 'LinkedInGeneration',
        recordId: record.id,
        tenantId,
        validatedAt: Date.now(),
      },
    };
  });
}
