/**
 * Pidgie Dashboard Card Types
 *
 * Card interface for the Pidgie dashboard business breakdown.
 * Source: Tenant business data.
 */

import type { ValidatedCard } from '../types.js';

/**
 * Business breakdown card — always-visible side panel item.
 * Shows a structured overview of the business for quick reference.
 */
export interface BusinessBreakdownCardData extends Record<string, unknown> {
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

export interface BusinessBreakdownCard extends ValidatedCard {
  type: 'business-breakdown';
  data: BusinessBreakdownCardData;
}
