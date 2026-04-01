/**
 * Pidgie Dashboard Card Mapper
 *
 * Maps tenant business data to the BusinessBreakdownCard.
 */

import { registerCardMapper } from '../build-card.js';

interface BusinessBreakdownRecord {
  id: string;
  businessName: string;
  category: string;
  services: Array<{
    name: string;
    available: boolean;
  }>;
  products: Array<{
    name: string;
    price: number;
    currency: string;
  }>;
  hours: {
    today: string | null;
    timezone: string;
  };
  faqCount: number;
  contactEmail?: string;
  contactPhone?: string;
}

export function registerBusinessBreakdownMapper(): void {
  registerCardMapper<BusinessBreakdownRecord>('business-breakdown', (record, tenantId) => ({
    type: 'business-breakdown',
    id: record.id,
    data: {
      businessName: record.businessName,
      category: record.category,
      services: record.services.map((s) => ({
        name: s.name,
        available: s.available,
      })),
      products: record.products.map((p) => ({
        name: p.name,
        price: p.price,
        currency: p.currency,
      })),
      hours: {
        today: record.hours.today,
        timezone: record.hours.timezone,
      },
      faqCount: record.faqCount,
      contactEmail: record.contactEmail,
      contactPhone: record.contactPhone,
    },
    source: {
      table: 'BusinessData',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));
}
