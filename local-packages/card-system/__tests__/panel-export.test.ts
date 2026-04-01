import { describe, test, expect } from 'vitest';
import type { PanelItem } from '../src/hooks/usePanel.js';
import {
  formatPanelItem,
  getPanelItemFilename,
  hasDownloadableImage,
  hasDownloadableHtml,
  getImageUrl,
  getHtmlContent,
} from '../src/utils/panel-export.js';

function makeItem(
  type: string,
  data: Record<string, unknown>,
  overrides: Partial<PanelItem> = {},
): PanelItem {
  return {
    id: 'test-1',
    type,
    cardId: `card-test-1`,
    data,
    pinned: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── hasDownloadableImage ───────────────────────────────────────────

describe('hasDownloadableImage', () => {
  test('returns true for ad-image with imageUrl', () => {
    const item = makeItem('ad-image', { imageUrl: 'https://example.com/img.png' });
    expect(hasDownloadableImage(item)).toBe(true);
  });

  test('returns false for ad-image without imageUrl', () => {
    const item = makeItem('ad-image', {});
    expect(hasDownloadableImage(item)).toBe(false);
  });

  test('returns false for ad-brief', () => {
    const item = makeItem('ad-brief', { imageUrl: 'https://example.com/img.png' });
    expect(hasDownloadableImage(item)).toBe(false);
  });

  test('returns true for image-batch with imageUrl', () => {
    const item = makeItem('image-batch', { imageUrl: 'https://example.com/batch.jpg' });
    expect(hasDownloadableImage(item)).toBe(true);
  });
});

// ─── getImageUrl ────────────────────────────────────────────────────

describe('getImageUrl', () => {
  test('extracts imageUrl from ad-image', () => {
    const item = makeItem('ad-image', { imageUrl: 'https://example.com/img.png' });
    expect(getImageUrl(item)).toBe('https://example.com/img.png');
  });

  test('returns null for non-image card', () => {
    const item = makeItem('ad-brief', { imageUrl: 'https://example.com/img.png' });
    expect(getImageUrl(item)).toBeNull();
  });

  test('returns null when imageUrl is missing', () => {
    const item = makeItem('ad-image', {});
    expect(getImageUrl(item)).toBeNull();
  });
});

// ─── hasDownloadableHtml ────────────────────────────────────────────

describe('hasDownloadableHtml', () => {
  test('returns true for email-preview with htmlBody', () => {
    const item = makeItem('email-preview', { htmlBody: '<p>Hello</p>' });
    expect(hasDownloadableHtml(item)).toBe(true);
  });

  test('returns false for email-preview without htmlBody', () => {
    const item = makeItem('email-preview', {});
    expect(hasDownloadableHtml(item)).toBe(false);
  });

  test('returns true for newsletter-preview with htmlContent', () => {
    const item = makeItem('newsletter-preview', { htmlContent: '<div>Newsletter</div>' });
    expect(hasDownloadableHtml(item)).toBe(true);
  });

  test('returns false for newsletter-preview without htmlContent', () => {
    const item = makeItem('newsletter-preview', {});
    expect(hasDownloadableHtml(item)).toBe(false);
  });

  test('returns false for unrelated card type', () => {
    const item = makeItem('social-post', { htmlBody: '<p>Fake</p>' });
    expect(hasDownloadableHtml(item)).toBe(false);
  });
});

// ─── getHtmlContent ─────────────────────────────────────────────────

describe('getHtmlContent', () => {
  test('extracts htmlBody from email-preview', () => {
    const item = makeItem('email-preview', { htmlBody: '<p>Hello</p>' });
    expect(getHtmlContent(item)).toBe('<p>Hello</p>');
  });

  test('extracts htmlContent from newsletter-preview', () => {
    const item = makeItem('newsletter-preview', { htmlContent: '<div>NL</div>' });
    expect(getHtmlContent(item)).toBe('<div>NL</div>');
  });

  test('returns null for non-html card type', () => {
    const item = makeItem('ad-brief', { htmlBody: '<p>Nope</p>' });
    expect(getHtmlContent(item)).toBeNull();
  });
});

// ─── getPanelItemFilename ───────────────────────────────────────────

describe('getPanelItemFilename', () => {
  test('uses type prefix and title slug', () => {
    const item = makeItem('ad-brief', { title: 'My Awesome Brief' });
    expect(getPanelItemFilename(item)).toBe('ad-brief-my-awesome-brief.md');
  });

  test('uses type as slug when no title', () => {
    const item = makeItem('pain-point', {});
    expect(getPanelItemFilename(item)).toBe('pain-point-pain-point.md');
  });

  test('uses csv extension for recipient-table', () => {
    const item = makeItem('recipient-table', { title: 'Leads Q1' });
    expect(getPanelItemFilename(item)).toBe('recipient-table-leads-q1.csv');
  });

  test('uses txt extension for social-post', () => {
    const item = makeItem('social-post', { title: 'Day 1 Post' });
    expect(getPanelItemFilename(item)).toBe('social-post-day-1-post.txt');
  });

  test('uses txt extension for linkedin-preview', () => {
    const item = makeItem('linkedin-preview', { title: 'LinkedIn Draft' });
    expect(getPanelItemFilename(item)).toBe('linkedin-preview-linkedin-draft.txt');
  });

  test('truncates long titles to 40 chars', () => {
    const item = makeItem('ad-script', {
      title: 'This Is A Very Long Title That Should Be Truncated Down To Forty Characters At Most',
    });
    const filename = getPanelItemFilename(item);
    // type prefix + slug (<=40 chars) + extension
    const slug = filename.replace('ad-script-', '').replace('.md', '');
    expect(slug.length).toBeLessThanOrEqual(40);
  });
});

// ─── formatPanelItem ────────────────────────────────────────────────

describe('formatPanelItem', () => {
  test('ad-brief: produces markdown with sections', () => {
    const item = makeItem('ad-brief', {
      platform: 'TikTok',
      product: 'Widget X',
      hookType: 'Question',
      hookText: 'Ever struggled with Y?',
      problemVisualization: 'Visual of frustrated user',
      solutionBenefit: 'Saves 2 hours daily',
      ctaAction: 'Buy Now',
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Ad Brief');
    expect(output).toContain('**Platform:** TikTok');
    expect(output).toContain('**Product:** Widget X');
    expect(output).toContain('## Hook');
    expect(output).toContain('**Type:** Question');
    expect(output).toContain('## Problem');
    expect(output).toContain('## Solution');
    expect(output).toContain('## CTA');
  });

  test('ad-script: produces scene-by-scene markdown', () => {
    const item = makeItem('ad-script', {
      platform: 'YouTube',
      totalDuration: '30s',
      scenes: [
        { sceneNumber: 1, duration: '5s', visual: 'Wide shot', voiceover: 'Intro line', onScreenText: 'SALE' },
        { sceneNumber: 2, duration: '10s', visual: 'Close up', voiceover: 'Detail', onScreenText: '' },
      ],
      talentNotes: 'Energetic',
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Ad Script');
    expect(output).toContain('## Scene 1 (5s)');
    expect(output).toContain('**Visual:** Wide shot');
    expect(output).toContain('**Voiceover:** Intro line');
    expect(output).toContain('## Scene 2 (10s)');
    expect(output).toContain('**Talent Notes:** Energetic');
  });

  test('ad-image: includes QA scores', () => {
    const item = makeItem('ad-image', {
      imageUrl: 'https://example.com/ad.png',
      platform: 'Instagram',
      dimensions: '1080x1080',
      qaScore: 87,
      qaBreakdown: { composition: 90, brandConsistency: 85 },
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Ad Image');
    expect(output).toContain('**QA Score:** 87');
    expect(output).toContain('## QA Breakdown');
    expect(output).toContain('- composition: 90');
  });

  test('ad-campaign-summary: produces executive summary', () => {
    const item = makeItem('ad-campaign-summary', {
      brandName: 'Acme',
      executiveSummary: 'Great campaign results.',
      topPainPoints: ['Pain 1', 'Pain 2'],
      recommendations: ['Try X'],
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Campaign Summary');
    expect(output).toContain('**Brand:** Acme');
    expect(output).toContain('## Executive Summary');
    expect(output).toContain('## Top Pain Points');
    expect(output).toContain('- Pain 1');
    expect(output).toContain('## Recommendations');
  });

  test('pain-point: includes quotes and angles', () => {
    const item = makeItem('pain-point', {
      category: 'Pricing',
      engagementScore: 42,
      verbatimQuotes: [{ text: 'Too expensive', url: 'https://reddit.com/r/test', subreddit: 'r/test' }],
      adAngles: ['Value angle', 'Comparison angle'],
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Pain Point');
    expect(output).toContain('**Category:** Pricing');
    expect(output).toContain('## Verbatim Quotes');
    expect(output).toContain('"Too expensive"');
    expect(output).toContain('## Ad Angles');
    expect(output).toContain('- Value angle');
  });

  test('competitor-pattern: includes patterns and trends', () => {
    const item = makeItem('competitor-pattern', {
      source: 'TikTok Ads',
      patterns: [{ hookType: 'Before/After', hookExample: 'See the difference', format: 'UGC', engagementSignal: 'High' }],
      trendingHooks: ['POV hook'],
      trendingFormats: ['Carousel'],
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Competitor Patterns');
    expect(output).toContain('**Source:** TikTok Ads');
    expect(output).toContain('### Before/After');
    expect(output).toContain('## Trending Hooks');
    expect(output).toContain('## Trending Formats');
  });

  test('email-preview: produces text fallback', () => {
    const item = makeItem('email-preview', {
      recipientName: 'John',
      recipientCompany: 'Acme',
      subject: 'Partnership Opportunity',
      status: 'draft',
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Email');
    expect(output).toContain('**To:** John');
    expect(output).toContain('**Subject:** Partnership Opportunity');
  });

  test('newsletter-preview: produces text fallback', () => {
    const item = makeItem('newsletter-preview', {
      title: 'Weekly Update',
      subject: 'This week in tech',
      sectionCount: 3,
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Newsletter');
    expect(output).toContain('**Title:** Weekly Update');
    expect(output).toContain('**Sections:** 3');
  });

  test('social-post: produces plain text with hashtags', () => {
    const item = makeItem('social-post', {
      day: 'Monday',
      dayNumber: 1,
      content: 'Check out our latest product!',
      hashtags: ['#launch', '#startup'],
      contentType: 'Educational',
    });
    const output = formatPanelItem(item);
    expect(output).toContain('Day 1: Monday');
    expect(output).toContain('Check out our latest product!');
    expect(output).toContain('#launch #startup');
  });

  test('linkedin-preview: produces plain text', () => {
    const item = makeItem('linkedin-preview', {
      authorName: 'Jane Doe',
      authorTitle: 'CEO',
      content: 'Exciting news!',
      hashtags: ['#leadership'],
      day: 'Tuesday',
    });
    const output = formatPanelItem(item);
    expect(output).toContain('Jane Doe');
    expect(output).toContain('CEO');
    expect(output).toContain('Exciting news!');
    expect(output).toContain('#leadership');
  });

  test('brand-profile: produces markdown', () => {
    const item = makeItem('brand-profile', {
      companyName: 'Acme Corp',
      tone: 'Professional',
      traits: ['Innovative', 'Trustworthy'],
      products: ['Widget A', 'Widget B'],
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Brand Profile');
    expect(output).toContain('**Company:** Acme Corp');
    expect(output).toContain('## Traits');
    expect(output).toContain('- Innovative');
    expect(output).toContain('## Products');
  });

  test('brand-analysis: produces markdown', () => {
    const item = makeItem('brand-analysis', {
      companyName: 'BrandCo',
      tone: 'Casual',
      contentTypes: ['Blog', 'Video'],
      competitorInsights: ['Competitor uses TikTok'],
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Brand Analysis');
    expect(output).toContain('**Company:** BrandCo');
    expect(output).toContain('## Content Types');
    expect(output).toContain('## Competitor Insights');
  });

  test('recipient-table: produces valid CSV', () => {
    const item = makeItem('recipient-table', {
      recipients: [
        { name: 'Alice', email: 'alice@example.com', company: 'Acme', temperature: 'hot', title: 'CTO' },
        { name: 'Bob', email: 'bob@example.com', company: 'Beta, Inc', temperature: 'warm', title: '' },
      ],
    });
    const output = formatPanelItem(item);
    const lines = output.split('\n');
    expect(lines[0]).toBe('Name,Email,Company,Title,Temperature');
    expect(lines[1]).toBe('Alice,alice@example.com,Acme,CTO,hot');
    // "Beta, Inc" should be quoted because it contains a comma
    expect(lines[2]).toContain('"Beta, Inc"');
  });

  test('recipient-table: empty recipients', () => {
    const item = makeItem('recipient-table', { recipients: [] });
    expect(formatPanelItem(item)).toBe('No recipients');
  });

  test('week-overview: produces day-by-day markdown', () => {
    const item = makeItem('week-overview', {
      totalPosts: 7,
      posts: [
        { day: 'Monday', dayNumber: 1, contentType: 'Educational', preview: 'Post about AI' },
        { day: 'Tuesday', dayNumber: 2, contentType: 'Story', preview: 'Our journey' },
      ],
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Week Overview');
    expect(output).toContain('**Total Posts:** 7');
    expect(output).toContain('## Day 1: Monday');
    expect(output).toContain('## Day 2: Tuesday');
  });

  test('persona: produces markdown with traits', () => {
    const item = makeItem('persona', {
      name: 'Tech Tina',
      industry: 'SaaS',
      voiceDescription: 'Enthusiastic and technical',
      traits: ['Data-driven', 'Early adopter'],
    });
    const output = formatPanelItem(item);
    expect(output).toContain('# Persona');
    expect(output).toContain('**Name:** Tech Tina');
    expect(output).toContain('## Voice');
    expect(output).toContain('## Traits');
    expect(output).toContain('- Data-driven');
  });

  test('unknown type: falls back to pretty-printed JSON', () => {
    const item = makeItem('custom-widget', { foo: 'bar', num: 42 });
    const output = formatPanelItem(item);
    const parsed = JSON.parse(output);
    expect(parsed.foo).toBe('bar');
    expect(parsed.num).toBe(42);
  });
});
