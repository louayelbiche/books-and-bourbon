/**
 * Campaign Agent Card Mappers
 *
 * Maps DB records from SalesCampaign, SalesCampaignRecipient, SalesCampaignEmail tables
 * to validated Campaign card types.
 */

import { registerCardMapper } from '../build-card.js';

interface BrandProfileRecord {
  id: string;
  companyName: string;
  tone: string;
  traits: string[];
  products: string[];
  website?: string;
  industry?: string;
}

/** Matches Prisma SalesCampaignRecipient record */
interface RecipientRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string | null;
  jobTitle?: string | null;
  leadTemperature: string; // LeadTemperature enum: HOT, WARM, COOL
}

/** recipient-table: list of recipients (from findMany) */
interface RecipientTableData {
  recipients: RecipientRecord[];
}

/** Matches Prisma SalesCampaignEmail with { include: { recipient: true } } */
interface EmailPreviewRecord {
  id: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  status: string; // CampaignEmailStatus enum: PENDING, SENT, FAILED, DEMO_SKIPPED
  recipient: {
    firstName: string;
    lastName: string;
    companyName?: string | null;
    leadTemperature: string;
  };
}

/** Matches Prisma SalesCampaign record */
interface CampaignSummaryRecord {
  id: string;
  name: string;
  status: string; // CampaignStatus enum: DRAFT, GENERATING, READY, SENDING, SENT, FAILED
  recipientCount: number;
  sentCount: number;
  createdAt: Date | string;
  emails?: Array<unknown>;
}

export function registerCampaignCardMappers(): void {
  registerCardMapper<BrandProfileRecord>('brand-profile', (record, tenantId) => ({
    type: 'brand-profile',
    id: record.id,
    data: {
      companyName: record.companyName,
      tone: record.tone,
      traits: record.traits,
      products: record.products,
      website: record.website,
      industry: record.industry,
    },
    source: {
      table: 'BrandProfile',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  // recipient-table maps an array of recipients (from findMany result)
  // The query function returns an array, wrapped as { recipients, totalCount }
  registerCardMapper<RecipientTableData>('recipient-table', (record, tenantId) => ({
    type: 'recipient-table',
    id: `rt-${tenantId}-${Date.now()}`,
    data: {
      recipients: (record.recipients || (record as unknown as RecipientRecord[])).map((r: RecipientRecord) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`.trim(),
        company: r.companyName || '',
        email: r.email,
        temperature: r.leadTemperature.toLowerCase(),
        title: r.jobTitle || undefined,
      })),
      totalCount: Array.isArray(record.recipients)
        ? record.recipients.length
        : (record as unknown as RecipientRecord[]).length,
    },
    source: {
      table: 'SalesCampaignRecipient',
      recordId: tenantId,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<EmailPreviewRecord>('email-preview', (record, tenantId) => ({
    type: 'email-preview',
    id: record.id,
    data: {
      recipientName: `${record.recipient.firstName} ${record.recipient.lastName}`.trim(),
      recipientCompany: record.recipient.companyName || '',
      recipientTemperature: record.recipient.leadTemperature.toLowerCase(),
      subject: record.subject,
      previewText: record.bodyText.substring(0, 200),
      htmlBody: record.bodyHtml,
      status: record.status.toLowerCase(),
    },
    source: {
      table: 'SalesCampaignEmail',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<CampaignSummaryRecord>('campaign-summary', (record, tenantId) => ({
    type: 'campaign-summary',
    id: record.id,
    data: {
      campaignName: record.name,
      status: record.status.toLowerCase(),
      recipientCount: record.recipientCount,
      emailCount: Array.isArray(record.emails) ? record.emails.length : 0,
      sentCount: record.sentCount,
      createdAt: typeof record.createdAt === 'string'
        ? record.createdAt
        : (record.createdAt as Date).toISOString(),
    },
    source: {
      table: 'SalesCampaign',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));
}
