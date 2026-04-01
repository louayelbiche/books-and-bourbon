import { describe, it, expect } from 'vitest';
import type { ScrapedPageInput } from '../../src/detection/types.js';
import { extractContactMethods, extractPhones, normalizePhone } from '../../src/detection/contacts.js';

function makePage(overrides: Partial<ScrapedPageInput> = {}): ScrapedPageInput {
  return {
    url: 'https://example.com',
    title: 'Test Page',
    headings: [],
    bodyText: '',
    links: [],
    ...overrides,
  };
}

describe('extractContactMethods', () => {
  it('extracts email from body text', () => {
    const pages = [makePage({ bodyText: 'Contact us at hello@realbusiness.com' })];
    const contacts = extractContactMethods(pages);
    expect(contacts.email).toBe('hello@realbusiness.com');
  });

  it('filters out platform/placeholder emails', () => {
    const pages = [makePage({ bodyText: 'Email noreply@hotel.com or hello@example.com' })];
    const contacts = extractContactMethods(pages);
    expect(contacts.email).toBeNull(); // both filtered: noreply@ prefix, example.com domain
  });

  it('extracts phone from body text', () => {
    const pages = [makePage({ bodyText: 'Call us at (555) 123-4567' })];
    const contacts = extractContactMethods(pages);
    expect(contacts.phone).toBe('(555) 123-4567');
  });

  it('extracts international phone numbers', () => {
    const pages = [makePage({ bodyText: 'Call +33 1 42 68 53 00 for info' })];
    const contacts = extractContactMethods(pages);
    expect(contacts.phone).toBeTruthy();
    expect(contacts.phone).toContain('+33');
  });

  it('rejects timestamps and short numbers', () => {
    const pages = [makePage({ bodyText: 'Open from 9:00 to 5:30 in 2026' })];
    const contacts = extractContactMethods(pages);
    expect(contacts.phone).toBeNull();
  });

  it('extracts address from JSON-LD', () => {
    const pages = [makePage({
      jsonLd: [{
        '@type': 'LocalBusiness',
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': '160 W 71st St',
          'addressLocality': 'New York',
          'addressRegion': 'NY',
          'postalCode': '10023',
        },
      }],
    })];
    const contacts = extractContactMethods(pages);
    expect(contacts.address).toBeTruthy();
    expect(contacts.address?.city).toBe('New York');
    expect(contacts.address?.street).toBe('160 W 71st St');
  });

  it('extracts phone from JSON-LD LocalBusiness', () => {
    const pages = [makePage({
      jsonLd: [{
        '@type': 'Restaurant',
        'telephone': '+1-305-400-4393',
      }],
    })];
    const contacts = extractContactMethods(pages);
    expect(contacts.phone).toContain('305');
  });

  it('detects contact form', () => {
    const pages = [makePage({ bodyText: 'Get in touch using our contact form' })];
    const contacts = extractContactMethods(pages);
    expect(contacts.form).toBe(true);
  });

  it('detects chat widgets', () => {
    const pages = [makePage({ bodyText: 'Powered by Intercom' })];
    const contacts = extractContactMethods(pages);
    expect(contacts.chat).toBe(true);
  });

  it('detects social media links', () => {
    const pages = [makePage({
      links: ['https://linkedin.com/company/test', 'https://twitter.com/test'],
    })];
    const contacts = extractContactMethods(pages);
    expect(contacts.social).toContain('linkedin');
    expect(contacts.social).toContain('twitter');
  });

  it('returns empty contacts for blank page', () => {
    const pages = [makePage()];
    const contacts = extractContactMethods(pages);
    expect(contacts.email).toBeNull();
    expect(contacts.phone).toBeNull();
    expect(contacts.form).toBe(false);
    expect(contacts.chat).toBe(false);
    expect(contacts.social).toEqual([]);
  });
});

// =====================================================================
// Phone extraction edge cases (GAP-14 fix)
// =====================================================================

describe('extractPhones', () => {
  it('extracts NANP with separators: (212) 555-1234', () => {
    const result = extractPhones('Call (212) 555-1234');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('212');
  });

  it('extracts NANP with dots: 212.555.1234', () => {
    const result = extractPhones('Phone: 212.555.1234');
    expect(result).toHaveLength(1);
  });

  it('extracts NANP without separators: 2125551234', () => {
    const result = extractPhones('Dial 2125551234 for help');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('212');
  });

  it('extracts +1 prefixed: +1 305-400-4393', () => {
    const result = extractPhones('Reach us: +1 305-400-4393');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('305');
  });

  it('extracts international: +33 1 42 68 53 00', () => {
    const result = extractPhones('Paris: +33 1 42 68 53 00');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('+33');
  });

  it('extracts Tunisian: +216 25 123 456', () => {
    const result = extractPhones('Call +216 25 123 456');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('+216');
  });

  it('rejects timestamps: 10:30', () => {
    const result = extractPhones('Open 10:30 to 5:00');
    expect(result).toHaveLength(0);
  });

  it('rejects all-same-digit: 0000000000', () => {
    const result = extractPhones('Code: 0000000000');
    expect(result).toHaveLength(0);
  });

  it('deduplicates same phone in different formats', () => {
    const result = extractPhones('(212) 555-1234 or 212-555-1234');
    expect(result).toHaveLength(1);
  });

  it('extracts multiple different phones', () => {
    const result = extractPhones('Main: (212) 555-1234, Fax: (212) 555-5678');
    expect(result).toHaveLength(2);
  });

  it('does not bleed into adjacent text', () => {
    const result = extractPhones('400-4393hello@donatellahotel.com');
    // 400-4393 alone is only 7 digits with a separator; should not match as a full phone
    // The pattern requires 3+3+4 groups for NANP
    for (const phone of result) {
      expect(phone).not.toContain('hello');
    }
  });
});

describe('normalizePhone', () => {
  it('formats 10-digit US number', () => {
    expect(normalizePhone('2125551234')).toBe('(212) 555-1234');
  });

  it('formats 11-digit US number with country code', () => {
    expect(normalizePhone('+13054004393')).toBe('+1 (305) 400-4393');
  });

  it('preserves international format', () => {
    expect(normalizePhone('+33 1 42 68 53 00')).toBe('+33 1 42 68 53 00');
  });
});
