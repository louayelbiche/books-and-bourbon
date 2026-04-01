/**
 * Browser-side utilities for exporting panel item data.
 * No external dependencies; uses native Blob, URL, and clipboard APIs.
 */

import type { PanelItem } from '../hooks/usePanel.js';

// ─── Download helpers ───────────────────────────────────────────────

/** Download a Blob as a file via a temporary anchor element. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Fetch an image from a URL and trigger a file download. */
export async function downloadImageUrl(
  url: string,
  filename: string,
): Promise<void> {
  const res = await fetch(url);
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

// ─── Clipboard ──────────────────────────────────────────────────────

/** Copy text to the clipboard. Returns true on success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ─── Image / HTML detection ─────────────────────────────────────────

const IMAGE_CARD_TYPES = new Set(['ad-image', 'image-batch']);

/** Check if a panel item contains a downloadable image URL. */
export function hasDownloadableImage(item: PanelItem): boolean {
  if (IMAGE_CARD_TYPES.has(item.type)) {
    return typeof item.data.imageUrl === 'string' && item.data.imageUrl !== '';
  }
  return false;
}

/** Extract the image URL from a panel item, or null. */
export function getImageUrl(item: PanelItem): string | null {
  if (hasDownloadableImage(item)) {
    return item.data.imageUrl as string;
  }
  return null;
}

const HTML_CARD_TYPES = new Set(['email-preview', 'newsletter-preview']);

/** Check if a panel item contains downloadable HTML. */
export function hasDownloadableHtml(item: PanelItem): boolean {
  if (item.type === 'email-preview') {
    return (
      typeof item.data.htmlBody === 'string' && item.data.htmlBody !== ''
    );
  }
  if (item.type === 'newsletter-preview') {
    return (
      typeof item.data.htmlContent === 'string' &&
      item.data.htmlContent !== ''
    );
  }
  return false;
}

/** Extract the HTML content from an email/newsletter panel item, or null. */
export function getHtmlContent(item: PanelItem): string | null {
  if (item.type === 'email-preview' && typeof item.data.htmlBody === 'string') {
    return item.data.htmlBody;
  }
  if (
    item.type === 'newsletter-preview' &&
    typeof item.data.htmlContent === 'string'
  ) {
    return item.data.htmlContent;
  }
  return null;
}

// ─── Per-type formatters ────────────────────────────────────────────

function formatAdBrief(d: Record<string, unknown>): string {
  const lines: string[] = ['# Ad Brief', ''];
  if (d.platform) lines.push(`**Platform:** ${d.platform}`);
  if (d.product) lines.push(`**Product:** ${d.product}`);
  if (d.format) lines.push(`**Format:** ${d.format}`);
  if (d.duration) lines.push(`**Duration:** ${d.duration}`);
  lines.push('');
  if (d.hookType || d.hookText) {
    lines.push('## Hook');
    if (d.hookType) lines.push(`**Type:** ${d.hookType}`);
    if (d.hookText) lines.push(`**Text:** ${d.hookText}`);
    if (d.hookVisual) lines.push(`**Visual:** ${d.hookVisual}`);
    lines.push('');
  }
  if (d.problemVisualization) {
    lines.push('## Problem');
    lines.push(String(d.problemVisualization));
    lines.push('');
  }
  if (d.solutionBenefit || d.solutionProofPoint) {
    lines.push('## Solution');
    if (d.solutionBenefit) lines.push(`**Benefit:** ${d.solutionBenefit}`);
    if (d.solutionProofPoint)
      lines.push(`**Proof Point:** ${d.solutionProofPoint}`);
    lines.push('');
  }
  if (d.ctaAction || d.ctaUrgency) {
    lines.push('## CTA');
    if (d.ctaAction) lines.push(`**Action:** ${d.ctaAction}`);
    if (d.ctaUrgency) lines.push(`**Urgency:** ${d.ctaUrgency}`);
  }
  return lines.join('\n');
}

interface ScriptScene {
  sceneNumber?: number;
  duration?: string;
  visual?: string;
  voiceover?: string;
  onScreenText?: string;
}

function formatAdScript(d: Record<string, unknown>): string {
  const lines: string[] = ['# Ad Script', ''];
  if (d.platform) lines.push(`**Platform:** ${d.platform}`);
  if (d.totalDuration) lines.push(`**Total Duration:** ${d.totalDuration}`);
  lines.push('');
  const scenes = d.scenes as ScriptScene[] | undefined;
  if (Array.isArray(scenes)) {
    for (const scene of scenes) {
      lines.push(`## Scene ${scene.sceneNumber ?? '?'} (${scene.duration ?? ''})`);
      if (scene.visual) lines.push(`**Visual:** ${scene.visual}`);
      if (scene.voiceover) lines.push(`**Voiceover:** ${scene.voiceover}`);
      if (scene.onScreenText) lines.push(`**On-screen:** ${scene.onScreenText}`);
      lines.push('');
    }
  }
  if (d.talentNotes) lines.push(`**Talent Notes:** ${d.talentNotes}`);
  if (d.musicDirection) lines.push(`**Music Direction:** ${d.musicDirection}`);
  return lines.join('\n');
}

function formatAdImage(d: Record<string, unknown>): string {
  const lines: string[] = ['# Ad Image', ''];
  if (d.imageUrl) lines.push(`**Image URL:** ${d.imageUrl}`);
  if (d.platform) lines.push(`**Platform:** ${d.platform}`);
  if (d.dimensions) lines.push(`**Dimensions:** ${d.dimensions}`);
  if (d.promptUsed) lines.push(`**Prompt:** ${d.promptUsed}`);
  if (typeof d.qaScore === 'number') lines.push(`**QA Score:** ${d.qaScore}`);
  const qa = d.qaBreakdown as Record<string, number> | undefined;
  if (qa && typeof qa === 'object') {
    lines.push('');
    lines.push('## QA Breakdown');
    for (const [k, v] of Object.entries(qa)) {
      lines.push(`- ${k}: ${v}`);
    }
  }
  return lines.join('\n');
}

function formatAdCampaignSummary(d: Record<string, unknown>): string {
  const lines: string[] = ['# Campaign Summary', ''];
  if (d.brandName) lines.push(`**Brand:** ${d.brandName}`);
  if (d.executiveSummary) {
    lines.push('');
    lines.push('## Executive Summary');
    lines.push(String(d.executiveSummary));
  }
  const topPainPoints = d.topPainPoints as string[] | undefined;
  if (Array.isArray(topPainPoints) && topPainPoints.length > 0) {
    lines.push('');
    lines.push('## Top Pain Points');
    for (const p of topPainPoints) lines.push(`- ${p}`);
  }
  const topHooks = d.topHooks as string[] | undefined;
  if (Array.isArray(topHooks) && topHooks.length > 0) {
    lines.push('');
    lines.push('## Top Hooks');
    for (const h of topHooks) lines.push(`- ${h}`);
  }
  const recs = d.recommendations as string[] | undefined;
  if (Array.isArray(recs) && recs.length > 0) {
    lines.push('');
    lines.push('## Recommendations');
    for (const r of recs) lines.push(`- ${r}`);
  }
  return lines.join('\n');
}

function formatPainPoint(d: Record<string, unknown>): string {
  const lines: string[] = ['# Pain Point', ''];
  if (d.category) lines.push(`**Category:** ${d.category}`);
  if (typeof d.engagementScore === 'number')
    lines.push(`**Engagement Score:** ${d.engagementScore}`);
  if (typeof d.relevanceScore === 'number')
    lines.push(`**Relevance Score:** ${d.relevanceScore}`);
  if (d.productFit) lines.push(`**Product Fit:** ${d.productFit}`);
  const quotes = d.verbatimQuotes as
    | Array<{ text?: string; url?: string; subreddit?: string }>
    | undefined;
  if (Array.isArray(quotes) && quotes.length > 0) {
    lines.push('');
    lines.push('## Verbatim Quotes');
    for (const q of quotes) {
      lines.push(`- "${q.text ?? ''}" (${q.subreddit ?? ''}, ${q.url ?? ''})`);
    }
  }
  const angles = d.adAngles as string[] | undefined;
  if (Array.isArray(angles) && angles.length > 0) {
    lines.push('');
    lines.push('## Ad Angles');
    for (const a of angles) lines.push(`- ${a}`);
  }
  return lines.join('\n');
}

function formatCompetitorPattern(d: Record<string, unknown>): string {
  const lines: string[] = ['# Competitor Patterns', ''];
  if (d.source) lines.push(`**Source:** ${d.source}`);
  const patterns = d.patterns as
    | Array<{
        hookType?: string;
        hookExample?: string;
        format?: string;
        engagementSignal?: string;
      }>
    | undefined;
  if (Array.isArray(patterns) && patterns.length > 0) {
    lines.push('');
    lines.push('## Patterns');
    for (const p of patterns) {
      lines.push(`### ${p.hookType ?? 'Unknown'}`);
      if (p.hookExample) lines.push(`**Example:** ${p.hookExample}`);
      if (p.format) lines.push(`**Format:** ${p.format}`);
      if (p.engagementSignal)
        lines.push(`**Engagement:** ${p.engagementSignal}`);
      lines.push('');
    }
  }
  const hooks = d.trendingHooks as string[] | undefined;
  if (Array.isArray(hooks) && hooks.length > 0) {
    lines.push('## Trending Hooks');
    for (const h of hooks) lines.push(`- ${h}`);
    lines.push('');
  }
  const formats = d.trendingFormats as string[] | undefined;
  if (Array.isArray(formats) && formats.length > 0) {
    lines.push('## Trending Formats');
    for (const f of formats) lines.push(`- ${f}`);
  }
  return lines.join('\n');
}

function formatEmailPreview(d: Record<string, unknown>): string {
  const lines: string[] = ['# Email', ''];
  if (d.recipientName) lines.push(`**To:** ${d.recipientName}`);
  if (d.recipientCompany) lines.push(`**Company:** ${d.recipientCompany}`);
  if (d.recipientTemperature)
    lines.push(`**Temperature:** ${d.recipientTemperature}`);
  if (d.subject) lines.push(`**Subject:** ${d.subject}`);
  if (d.previewText) lines.push(`**Preview:** ${d.previewText}`);
  if (d.status) lines.push(`**Status:** ${d.status}`);
  return lines.join('\n');
}

function formatNewsletterPreview(d: Record<string, unknown>): string {
  const lines: string[] = ['# Newsletter', ''];
  if (d.title) lines.push(`**Title:** ${d.title}`);
  if (d.subject) lines.push(`**Subject:** ${d.subject}`);
  if (typeof d.sectionCount === 'number')
    lines.push(`**Sections:** ${d.sectionCount}`);
  return lines.join('\n');
}

function formatSocialPost(d: Record<string, unknown>): string {
  const lines: string[] = [];
  if (d.day) lines.push(`Day ${d.dayNumber ?? ''}: ${d.day}`);
  if (d.contentType) lines.push(`Type: ${d.contentType}`);
  lines.push('');
  if (d.content) lines.push(String(d.content));
  const hashtags = d.hashtags as string[] | undefined;
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    lines.push('');
    lines.push(hashtags.join(' '));
  }
  return lines.join('\n');
}

function formatLinkedInPreview(d: Record<string, unknown>): string {
  const lines: string[] = [];
  if (d.authorName) lines.push(`${d.authorName}`);
  if (d.authorTitle) lines.push(`${d.authorTitle}`);
  if (d.day) lines.push(`Day: ${d.day}`);
  lines.push('');
  if (d.content) lines.push(String(d.content));
  const hashtags = d.hashtags as string[] | undefined;
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    lines.push('');
    lines.push(hashtags.join(' '));
  }
  return lines.join('\n');
}

function formatBrandProfile(d: Record<string, unknown>): string {
  const lines: string[] = ['# Brand Profile', ''];
  if (d.companyName) lines.push(`**Company:** ${d.companyName}`);
  if (d.tone) lines.push(`**Tone:** ${d.tone}`);
  if (d.industry) lines.push(`**Industry:** ${d.industry}`);
  if (d.website) lines.push(`**Website:** ${d.website}`);
  const traits = d.traits as string[] | undefined;
  if (Array.isArray(traits) && traits.length > 0) {
    lines.push('');
    lines.push('## Traits');
    for (const t of traits) lines.push(`- ${t}`);
  }
  const products = d.products as string[] | undefined;
  if (Array.isArray(products) && products.length > 0) {
    lines.push('');
    lines.push('## Products');
    for (const p of products) lines.push(`- ${p}`);
  }
  return lines.join('\n');
}

function formatBrandAnalysis(d: Record<string, unknown>): string {
  const lines: string[] = ['# Brand Analysis', ''];
  if (d.companyName) lines.push(`**Company:** ${d.companyName}`);
  if (d.tone) lines.push(`**Tone:** ${d.tone}`);
  if (d.targetAudience) lines.push(`**Target Audience:** ${d.targetAudience}`);
  if (d.industry) lines.push(`**Industry:** ${d.industry}`);
  const types = d.contentTypes as string[] | undefined;
  if (Array.isArray(types) && types.length > 0) {
    lines.push('');
    lines.push('## Content Types');
    for (const t of types) lines.push(`- ${t}`);
  }
  const insights = d.competitorInsights as string[] | undefined;
  if (Array.isArray(insights) && insights.length > 0) {
    lines.push('');
    lines.push('## Competitor Insights');
    for (const i of insights) lines.push(`- ${i}`);
  }
  return lines.join('\n');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatRecipientTable(d: Record<string, unknown>): string {
  const recipients = d.recipients as
    | Array<{
        name?: string;
        email?: string;
        company?: string;
        temperature?: string;
        title?: string;
      }>
    | undefined;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return 'No recipients';
  }
  const header = 'Name,Email,Company,Title,Temperature';
  const rows = recipients.map((r) =>
    [
      escapeCsvField(r.name ?? ''),
      escapeCsvField(r.email ?? ''),
      escapeCsvField(r.company ?? ''),
      escapeCsvField(r.title ?? ''),
      escapeCsvField(r.temperature ?? ''),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

function formatWeekOverview(d: Record<string, unknown>): string {
  const lines: string[] = ['# Week Overview', ''];
  if (typeof d.totalPosts === 'number')
    lines.push(`**Total Posts:** ${d.totalPosts}`);
  const posts = d.posts as
    | Array<{
        day?: string;
        dayNumber?: number;
        contentType?: string;
        preview?: string;
      }>
    | undefined;
  if (Array.isArray(posts)) {
    lines.push('');
    for (const p of posts) {
      lines.push(
        `## Day ${p.dayNumber ?? '?'}: ${p.day ?? ''}`,
      );
      if (p.contentType) lines.push(`**Type:** ${p.contentType}`);
      if (p.preview) lines.push(p.preview);
      lines.push('');
    }
  }
  return lines.join('\n');
}

function formatPersona(d: Record<string, unknown>): string {
  const lines: string[] = ['# Persona', ''];
  if (d.name) lines.push(`**Name:** ${d.name}`);
  if (d.industry) lines.push(`**Industry:** ${d.industry}`);
  if (d.voiceDescription) {
    lines.push('');
    lines.push('## Voice');
    lines.push(String(d.voiceDescription));
  }
  const traits = d.traits as string[] | undefined;
  if (Array.isArray(traits) && traits.length > 0) {
    lines.push('');
    lines.push('## Traits');
    for (const t of traits) lines.push(`- ${t}`);
  }
  return lines.join('\n');
}

// ─── Public formatting / filename ───────────────────────────────────

const FORMATTERS: Record<string, (d: Record<string, unknown>) => string> = {
  'ad-brief': formatAdBrief,
  'ad-script': formatAdScript,
  'ad-image': formatAdImage,
  'ad-campaign-summary': formatAdCampaignSummary,
  'pain-point': formatPainPoint,
  'competitor-pattern': formatCompetitorPattern,
  'email-preview': formatEmailPreview,
  'newsletter-preview': formatNewsletterPreview,
  'social-post': formatSocialPost,
  'linkedin-preview': formatLinkedInPreview,
  'brand-profile': formatBrandProfile,
  'brand-analysis': formatBrandAnalysis,
  'recipient-table': formatRecipientTable,
  'week-overview': formatWeekOverview,
  'persona': formatPersona,
};

/** Format a PanelItem's data as human-readable text for copy/download. */
export function formatPanelItem(item: PanelItem): string {
  const formatter = FORMATTERS[item.type];
  if (formatter) {
    return formatter(item.data);
  }
  return JSON.stringify(item.data, null, 2);
}

const EXTENSIONS: Record<string, string> = {
  'recipient-table': 'csv',
  'email-preview': 'md',
  'newsletter-preview': 'md',
  'social-post': 'txt',
  'linkedin-preview': 'txt',
};

/** Get a suggested filename for downloading a panel item. */
export function getPanelItemFilename(item: PanelItem): string {
  const ext = EXTENSIONS[item.type] ?? 'md';
  const slug =
    typeof item.data.title === 'string'
      ? item.data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40)
      : item.type;
  return `${item.type}-${slug}.${ext}`;
}
