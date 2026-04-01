/**
 * Engagement Agent Card Types
 *
 * Card interfaces for the Engagement (Newsletter) agent.
 * Source tables: Newsletter, Newsletter sections, persona config.
 */

import type { ValidatedCard } from '../types.js';

/**
 * Persona card — shows the selected audience persona.
 * Displayed during persona assignment phase.
 */
export interface PersonaCardData extends Record<string, unknown> {
  name: string;
  avatar?: string;
  voiceDescription: string;
  industry: string;
  traits?: string[];
}

export interface PersonaCard extends ValidatedCard {
  type: 'persona';
  data: PersonaCardData;
}

/**
 * Subject line card — one of 3 generated subject line options.
 * Selectable — clicking sends selection to agent.
 */
export interface SubjectLineCardData extends Record<string, unknown> {
  subject: string;
  previewText: string;
  selected?: boolean;
  index: number;
}

export interface SubjectLineCard extends ValidatedCard {
  type: 'subject-line';
  data: SubjectLineCardData;
}

/**
 * Newsletter preview card — full newsletter pushed to side panel.
 * Shows rendered HTML content of the newsletter.
 */
export interface NewsletterPreviewCardData extends Record<string, unknown> {
  title: string;
  subject: string;
  htmlContent: string;
  sectionCount: number;
}

export interface NewsletterPreviewCard extends ValidatedCard {
  type: 'newsletter-preview';
  data: NewsletterPreviewCardData;
}

/**
 * Section card — individual newsletter section for inline display.
 * Shows during the iteration phase.
 */
export interface SectionCardData extends Record<string, unknown> {
  title: string;
  content: string;
  order: number;
  wordCount?: number;
}

export interface SectionCard extends ValidatedCard {
  type: 'section';
  data: SectionCardData;
}

/**
 * Newsletter summary card — overview of the completed newsletter.
 */
export interface NewsletterSummaryCardData extends Record<string, unknown> {
  title: string;
  subject: string;
  sectionCount: number;
  wordCount: number;
  recipientCount?: number;
  status: 'draft' | 'scheduled' | 'sent';
  scheduledAt?: string;
}

export interface NewsletterSummaryCard extends ValidatedCard {
  type: 'newsletter-summary';
  data: NewsletterSummaryCardData;
}
