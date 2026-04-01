/**
 * Engagement Agent Card Mappers
 *
 * Maps DB records from Newsletter tables
 * to validated Engagement card types.
 */

import { registerCardMapper } from '../build-card.js';

interface PersonaRecord {
  id: string;
  name: string;
  avatar?: string;
  voiceDescription: string;
  industry: string;
  traits?: string[];
}

interface SubjectLineRecord {
  id: string;
  subject: string;
  previewText: string;
  selected?: boolean;
  index: number;
}

/** Matches Prisma Newsletter record */
interface NewsletterPreviewRecord {
  id: string;
  headline: string;
  subject?: string | null;
  bodyHtml: string;
  bodyText?: string | null;
}

interface SectionRecord {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount?: number;
}

/** Matches Prisma Newsletter record */
interface NewsletterSummaryRecord {
  id: string;
  headline: string;
  subject?: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
  status: string; // NewsletterStatus enum: DRAFT, SCHEDULED, SENT, etc.
  createdAt: Date | string;
}

export function registerEngagementCardMappers(): void {
  registerCardMapper<PersonaRecord>('persona', (record, tenantId) => ({
    type: 'persona',
    id: record.id,
    data: {
      name: record.name,
      avatar: record.avatar,
      voiceDescription: record.voiceDescription,
      industry: record.industry,
      traits: record.traits,
    },
    source: {
      table: 'Persona',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<SubjectLineRecord>('subject-line', (record, tenantId) => ({
    type: 'subject-line',
    id: record.id,
    data: {
      subject: record.subject,
      previewText: record.previewText,
      selected: record.selected,
      index: record.index,
    },
    source: {
      table: 'SubjectLine',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<NewsletterPreviewRecord>('newsletter-preview', (record, tenantId) => {
    // Estimate section count from heading tags in HTML or paragraph breaks in text
    const sectionCount = record.bodyHtml
      ? (record.bodyHtml.match(/<h[1-3][^>]*>/gi) || []).length || 1
      : record.bodyText
        ? record.bodyText.split(/\n{2,}/).filter(Boolean).length
        : 0;
    return {
      type: 'newsletter-preview',
      id: record.id,
      data: {
        title: record.headline,
        subject: record.subject || '',
        htmlContent: record.bodyHtml,
        sectionCount,
      },
      source: {
        table: 'Newsletter',
        recordId: record.id,
        tenantId,
        validatedAt: Date.now(),
      },
    };
  });

  registerCardMapper<SectionRecord>('section', (record, tenantId) => ({
    type: 'section',
    id: record.id,
    data: {
      title: record.title,
      content: record.content,
      order: record.order,
      wordCount: record.wordCount,
    },
    source: {
      table: 'NewsletterSection',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<NewsletterSummaryRecord>('newsletter-summary', (record, tenantId) => {
    const wordCount = record.bodyText
      ? record.bodyText.split(/\s+/).filter(Boolean).length
      : 0;
    const sectionCount = record.bodyHtml
      ? (record.bodyHtml.match(/<h[1-3][^>]*>/gi) || []).length || 1
      : record.bodyText
        ? record.bodyText.split(/\n{2,}/).filter(Boolean).length
        : 0;
    return {
      type: 'newsletter-summary',
      id: record.id,
      data: {
        title: record.headline,
        subject: record.subject || '',
        sectionCount,
        wordCount,
        status: record.status.toLowerCase(),
        createdAt: typeof record.createdAt === 'string'
          ? record.createdAt
          : (record.createdAt as Date).toISOString(),
      },
      source: {
        table: 'Newsletter',
        recordId: record.id,
        tenantId,
        validatedAt: Date.now(),
      },
    };
  });
}
