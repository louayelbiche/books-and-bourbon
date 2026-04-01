/**
 * Agent Card Mapper Tests
 *
 * Tests for campaign, engagement, social, and pidgie card mappers.
 * Verifies that DB records are correctly mapped to ValidatedCards.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCardMapper,
  buildCardFromDB,
} from '../src/validation/build-card.js';
import type { CardQueryFn } from '../src/validation/build-card.js';
import { registerCampaignCardMappers } from '../src/validation/mappers/campaign-mappers.js';
import { registerEngagementCardMappers } from '../src/validation/mappers/engagement-mappers.js';
import { registerSocialCardMappers } from '../src/validation/mappers/social-mappers.js';
import { registerBusinessBreakdownMapper } from '../src/validation/mappers/pidgie-mappers.js';

const TENANT_ID = 'tenant-test-001';

// ─── Campaign Mappers ───────────────────────────────────────────────

describe('Campaign card mappers', () => {
  beforeEach(() => {
    registerCampaignCardMappers();
  });

  it('maps brand-profile record', async () => {
    const record = {
      id: 'b1ffcd00-0d1c-4f09-bc7e-7cc0ce491b22',
      companyName: 'Acme Corp',
      tone: 'professional',
      traits: ['innovative', 'reliable'],
      products: ['Widget Pro', 'Widget Lite'],
      website: 'https://acme.example.com',
      industry: 'Technology',
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('brand-profile', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.type).toBe('brand-profile');
      expect(result.card.data.companyName).toBe('Acme Corp');
      expect(result.card.data.traits).toEqual(['innovative', 'reliable']);
      expect(result.card.source.table).toBe('BrandProfile');
    }
  });

  it('maps email-preview record', async () => {
    const record = {
      id: 'c2ffcd00-0d1c-4f09-bc7e-7cc0ce491b33',
      subject: 'Partnership Opportunity',
      bodyHtml: '<p>Hi Jane, I wanted to reach out...</p>',
      bodyText: 'Hi Jane, I wanted to reach out...',
      status: 'PENDING',
      recipient: {
        firstName: 'Jane',
        lastName: 'Doe',
        companyName: 'TechCo',
        leadTemperature: 'WARM',
      },
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('email-preview', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.type).toBe('email-preview');
      expect(result.card.data.recipientName).toBe('Jane Doe');
      expect(result.card.data.recipientTemperature).toBe('warm');
      expect(result.card.source.table).toBe('SalesCampaignEmail');
    }
  });

  it('maps campaign-summary record', async () => {
    const record = {
      id: 'd3ffcd00-0d1c-4f09-bc7e-7cc0ce491b44',
      name: 'Q1 Outreach',
      status: 'ACTIVE',
      recipientCount: 150,
      sentCount: 75,
      createdAt: '2026-01-15T10:00:00Z',
      emails: Array.from({ length: 150 }, (_, i) => ({ id: `e-${i}` })),
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('campaign-summary', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.data.campaignName).toBe('Q1 Outreach');
      expect(result.card.data.recipientCount).toBe(150);
      expect(result.card.data.emailCount).toBe(150);
    }
  });

  it('maps recipient-table record', async () => {
    const record = {
      id: 'e4ffcd00-0d1c-4f09-bc7e-7cc0ce491b55',
      recipients: [
        { id: 'r1', firstName: 'John', lastName: 'Smith', companyName: 'ABC', email: 'john@abc.com', leadTemperature: 'HOT', jobTitle: null },
        { id: 'r2', firstName: 'Jane', lastName: 'Doe', companyName: 'XYZ', email: 'jane@xyz.com', leadTemperature: 'COOL', jobTitle: null },
      ],
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('recipient-table', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.data.totalCount).toBe(2);
      expect((result.card.data.recipients as any[]).length).toBe(2);
    }
  });
});

// ─── Engagement Mappers ─────────────────────────────────────────────

describe('Engagement card mappers', () => {
  beforeEach(() => {
    registerEngagementCardMappers();
  });

  it('maps persona record', async () => {
    const record = {
      id: 'f5ffcd00-0d1c-4f09-bc7e-7cc0ce491b66',
      name: 'Tech Enthusiast',
      voiceDescription: 'Excited, forward-thinking',
      industry: 'SaaS',
      traits: ['analytical', 'curious'],
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('persona', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.type).toBe('persona');
      expect(result.card.data.name).toBe('Tech Enthusiast');
      expect(result.card.source.table).toBe('Persona');
    }
  });

  it('maps subject-line record', async () => {
    const record = {
      id: 'a6ffcd00-0d1c-4f09-bc7e-7cc0ce491b77',
      subject: '5 Tips for Better Code',
      previewText: 'Learn how to write cleaner...',
      selected: false,
      index: 0,
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('subject-line', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.data.subject).toBe('5 Tips for Better Code');
      expect(result.card.data.index).toBe(0);
    }
  });

  it('maps newsletter-summary record', async () => {
    const record = {
      id: 'b7ffcd00-0d1c-4f09-bc7e-7cc0ce491b88',
      headline: 'Weekly Update',
      subject: 'Your Weekly Digest',
      bodyHtml: '<h2>Section 1</h2><p>text</p><h2>Section 2</h2><p>text</p><h2>Section 3</h2><p>text</p><h2>Section 4</h2><p>text</p>',
      bodyText: 'This is a newsletter body with enough words to count properly for the word count test assertion value we need here',
      status: 'SCHEDULED',
      createdAt: '2026-02-28T09:00:00Z',
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('newsletter-summary', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.data.status).toBe('scheduled');
      expect(result.card.data.title).toBe('Weekly Update');
      expect(result.card.data.sectionCount).toBe(4);
      expect(typeof result.card.data.wordCount).toBe('number');
    }
  });
});

// ─── Social Mappers ─────────────────────────────────────────────────

describe('Social card mappers', () => {
  beforeEach(() => {
    registerSocialCardMappers();
  });

  it('maps brand-analysis record', async () => {
    const record = {
      id: 'c8ffcd00-0d1c-4f09-bc7e-7cc0ce491b99',
      companyName: 'TechStart',
      tone: 'thought-leadership',
      postType: 'article',
      industry: 'Enterprise Software',
      analysisJson: {
        contentTypes: ['article', 'case-study'],
        targetAudience: 'CTOs',
      },
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('brand-analysis', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.type).toBe('brand-analysis');
      expect(result.card.data.contentTypes).toEqual(['article', 'case-study']);
      expect(result.card.source.table).toBe('LinkedInGeneration');
    }
  });

  it('maps social-post record', async () => {
    const record = {
      id: 'd9ffcd00-0d1c-4f09-bc7e-7cc0ce491baa',
      dayOfWeek: 'Monday',
      theme: 'thought-leadership',
      content: 'Excited to share our latest...',
      hashtags: ['#tech', '#innovation'],
      characterCount: 180,
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('social-post', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.data.day).toBe('Monday');
      expect(result.card.data.hashtags).toEqual(['#tech', '#innovation']);
    }
  });

  it('maps week-overview with aggregated posts', async () => {
    const record = {
      id: 'e1ffcd00-0d1c-4f09-bc7e-7cc0ce491bbb',
      companyName: 'TechStart',
      tone: 'thought-leadership',
      postType: 'article',
      posts: [
        { dayOfWeek: 'Monday', theme: 'article', content: 'Day 1 content that is long enough to be previewed properly in the card output', characterCount: 200 },
        { dayOfWeek: 'Tuesday', theme: 'case-study', content: 'Day 2 content that is long enough to be previewed properly in the card output', characterCount: 250 },
      ],
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('week-overview', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.data.totalPosts).toBe(2);
      expect((result.card.data.posts as any[]).length).toBe(2);
      expect(result.card.data.generationId).toBe(record.id);
    }
  });
});

// ─── Pidgie Mapper ──────────────────────────────────────────────────

describe('BusinessBreakdown card mapper', () => {
  beforeEach(() => {
    registerBusinessBreakdownMapper();
  });

  it('maps business-breakdown record', async () => {
    const record = {
      id: 'f2ffcd00-0d1c-4f09-bc7e-7cc0ce491bcc',
      businessName: 'Urban Cuts',
      category: 'Barbershop',
      services: [
        { name: 'Haircut', available: true },
        { name: 'Beard Trim', available: true },
      ],
      products: [
        { name: 'Hair Wax', price: 15, currency: 'USD' },
      ],
      hours: { today: '9:00 AM - 6:00 PM', timezone: 'America/New_York' },
      faqCount: 8,
      contactEmail: 'info@urbancuts.com',
    };

    const queryFn: CardQueryFn = async () => record;
    const result = await buildCardFromDB('business-breakdown', record.id, TENANT_ID, queryFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.card.type).toBe('business-breakdown');
      expect(result.card.data.businessName).toBe('Urban Cuts');
      expect((result.card.data.services as any[]).length).toBe(2);
      expect(result.card.source.table).toBe('BusinessData');
    }
  });
});
