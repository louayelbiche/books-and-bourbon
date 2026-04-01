/**
 * Campaign Agent Card Types
 *
 * Card interfaces for the Campaign (Sales Email) agent.
 * Source tables: SalesCampaign, SalesRecipient, SalesEmail, BrandProfile state.
 */

import type { ValidatedCard } from '../types.js';

/**
 * Brand profile card — displayed after analyze_brand tool completes.
 * Shows extracted brand identity for agent to reference.
 */
export interface BrandProfileCardData extends Record<string, unknown> {
  companyName: string;
  tone: string;
  traits: string[];
  products: string[];
  website?: string;
  industry?: string;
}

export interface BrandProfileCard extends ValidatedCard {
  type: 'brand-profile';
  data: BrandProfileCardData;
}

/**
 * Recipient table card — shows list of generated email recipients.
 * Inline with expandable rows; "View All" pushes to side panel.
 */
export interface RecipientTableCardData extends Record<string, unknown> {
  recipients: Array<{
    id: string;
    name: string;
    company: string;
    email: string;
    temperature: 'hot' | 'warm' | 'cold';
    title?: string;
  }>;
  totalCount: number;
}

export interface RecipientTableCard extends ValidatedCard {
  type: 'recipient-table';
  data: RecipientTableCardData;
}

/**
 * Email preview card — compact inline preview of a drafted email.
 * "Preview Full Email" button triggers panel_push with full HTML.
 */
export interface EmailPreviewCardData extends Record<string, unknown> {
  recipientName: string;
  recipientCompany: string;
  recipientTemperature: 'hot' | 'warm' | 'cold';
  subject: string;
  previewText: string;
  htmlBody?: string;
  status: 'draft' | 'sent' | 'delivered' | 'opened' | 'bounced';
}

export interface EmailPreviewCard extends ValidatedCard {
  type: 'email-preview';
  data: EmailPreviewCardData;
}

/**
 * Campaign summary card — overview of the entire campaign.
 * Shows after all emails are drafted.
 */
export interface CampaignSummaryCardData extends Record<string, unknown> {
  campaignName: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  recipientCount: number;
  emailCount: number;
  sentCount?: number;
  openRate?: number;
  createdAt: string;
}

export interface CampaignSummaryCard extends ValidatedCard {
  type: 'campaign-summary';
  data: CampaignSummaryCardData;
}
