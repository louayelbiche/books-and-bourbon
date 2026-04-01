/**
 * Contact Method Extraction
 *
 * Extracts contact information from scraped website content.
 * Patterns researched from production systems (libphonenumber, usaddress, isemail).
 *
 * Extraction priority: JSON-LD > mailto/tel links > footer > body text regex
 */

import type { ContactMethods, ScrapedPageInput } from './types.js';
import { DETECTION_PATTERNS } from './patterns.js';

// ============================================================================
// Email
// ============================================================================

/**
 * Email regex:
 * - Local part must START with a letter (rejects "400-4393hello@hotel.com")
 * - Negative lookahead prevents TLD bleed ("info@co.comFOLLOW" stops at ".com")
 * - TLD capped at 2-6 chars (covers com/org/net/edu/gov/io/co/uk/info/name)
 *
 * An email is: letter(s/digits/dots/hyphens)@domain.tld
 * What is NOT an email: digits-and-text@domain (that's phone + text bleeding together)
 */
const EMAIL_REGEX = /[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}(?![a-zA-Z])/g;

/** Emails to ignore: platform, CMS, placeholder, generic. */
const IGNORE_EMAIL_PATTERNS: RegExp[] = [
  /^noreply@/i, /^no-reply@/i, /^donotreply@/i,
  /^info@wordpress/i, /^admin@wordpress/i,
  /^your@/i, /^name@/i, /^user@/i, /^test@/i,
  /^email@/i, /^mail@/i, /^someone@/i, /^example@/i,
  /^placeholder@/i,
];

const IGNORE_EMAIL_DOMAINS = new Set([
  'wix.com', 'squarespace.com', 'example.com', 'email.com',
  'sentry.io', 'sentry-next.wixpress.com', 'google.com',
]);

export function shouldIgnoreEmail(email: string): boolean {
  if (!email || !email.includes('@')) return true;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  if (IGNORE_EMAIL_DOMAINS.has(domain)) return true;
  return IGNORE_EMAIL_PATTERNS.some(p => p.test(email));
}

export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (shouldIgnoreEmail(lower) || seen.has(lower)) continue;
    seen.add(lower);
    result.push(m);
  }
  return result;
}

// ============================================================================
// Phone
// ============================================================================

/**
 * North American phone: optional separators between groups.
 * Matches: (212) 555-1234, 212-555-1234, 212.555.1234, +1 800-555-1234, 2125551234
 * The separator between area code and next group is optional to catch unseparated numbers.
 * Word boundary ensures we don't match inside longer digit sequences.
 */
const PHONE_NANP = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)[-.\s]?|\d{3}[-.\s]?)\d{3}[-.\s]?\d{4}(?!\d)/g;

/**
 * International phone with + prefix (always valid when +country code present).
 * Matches: +33 1 42 68 53 00, +216 25 123 456, +44 20 7946 0958
 */
const PHONE_INTL = /\+\d{1,3}[-.\s]\d[\d\s.-]{5,14}\d/g;

/** Patterns that look like phone numbers but aren't. */
const TIMESTAMP_RE = /\d{1,2}:\d{2}/;
const ALL_SAME_DIGIT_RE = /^(\d)\1+$/;

/** Check if a potential phone match is actually valid. */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');

  // Must be 7-15 digits
  if (digits.length < 7 || digits.length > 15) return false;

  // Reject timestamps (10:30, 2:45)
  if (TIMESTAMP_RE.test(raw)) return false;

  // Reject all-same-digit sequences (0000000, 1111111)
  if (ALL_SAME_DIGIT_RE.test(digits)) return false;

  // Reject unbalanced parentheses
  const opens = (raw.match(/\(/g) || []).length;
  const closes = (raw.match(/\)/g) || []).length;
  if (opens !== closes) return false;

  return true;
}

/** Normalize to readable format with E.164 awareness. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  // US/Canada: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // US/Canada: 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // International with + prefix: keep as-is but clean whitespace
  if (raw.trim().startsWith('+')) {
    return raw.trim().replace(/\s+/g, ' ');
  }
  return raw.trim();
}

export function extractPhones(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  // NANP first (most common for our target markets)
  for (const m of text.match(PHONE_NANP) || []) {
    if (!isValidPhone(m)) continue;
    const digits = m.replace(/\D/g, '');
    if (seen.has(digits)) continue;
    seen.add(digits);
    result.push(normalizePhone(m));
  }

  // International
  for (const m of text.match(PHONE_INTL) || []) {
    if (!isValidPhone(m)) continue;
    const digits = m.replace(/\D/g, '');
    if (seen.has(digits)) continue;
    seen.add(digits);
    result.push(normalizePhone(m));
  }

  return result;
}

// ============================================================================
// Address
// ============================================================================

export interface ExtractedAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
}

/** US state + CA province codes for ZIP-anchored address extraction. */
const STATE_CODES = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT';

/**
 * ZIP-anchored address regex: finds state code + ZIP, then captures preceding text as street/city.
 * US ZIP: 5 digits or 5+4. Canadian postal: A1A 1A1.
 */
const ADDRESS_REGEX = new RegExp(
  `([\\w\\s,.#-]{10,60}),?\\s*(${STATE_CODES})[,.]?\\s+(\\d{5}(?:-\\d{4})?|[A-Z]\\d[A-Z]\\s?\\d[A-Z]\\d)`,
  'g'
);

/** Extract addresses from JSON-LD PostalAddress objects. */
export function extractAddressFromJsonLd(jsonLdItems: unknown[]): ExtractedAddress | null {
  for (const item of jsonLdItems) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    // Handle @graph arrays
    if (Array.isArray(obj['@graph'])) {
      const result = extractAddressFromJsonLd(obj['@graph'] as unknown[]);
      if (result) return result;
    }

    const address = obj.address as Record<string, unknown> | undefined;
    if (address && typeof address === 'object') {
      if (address.streetAddress || address.addressLocality) {
        const extracted: ExtractedAddress = {};
        if (address.streetAddress) extracted.street = String(address.streetAddress);
        if (address.addressLocality) extracted.city = String(address.addressLocality);
        if (address.addressRegion) extracted.state = String(address.addressRegion);
        if (address.postalCode) extracted.postalCode = String(address.postalCode);
        if (address.addressCountry) {
          const c = address.addressCountry;
          extracted.country = typeof c === 'object' && c !== null
            ? String((c as Record<string, unknown>).name || '')
            : String(c);
        }
        const parts = [extracted.street, extracted.city, extracted.state, extracted.postalCode, extracted.country].filter(Boolean);
        if (parts.length >= 2) {
          extracted.formatted = parts.join(', ');
          return extracted;
        }
      }
    }
  }
  return null;
}

/** Extract addresses from body text using ZIP-anchored regex. */
export function extractAddressFromText(text: string): ExtractedAddress | null {
  const match = ADDRESS_REGEX.exec(text);
  ADDRESS_REGEX.lastIndex = 0; // reset global regex
  if (!match) return null;

  const beforeState = match[1].trim();
  const state = match[2];
  const zip = match[3];

  // Split "123 Main St, New York" into street and city at last comma
  const lastComma = beforeState.lastIndexOf(',');
  let street: string | undefined;
  let city: string | undefined;
  if (lastComma > 0) {
    street = beforeState.slice(0, lastComma).trim();
    city = beforeState.slice(lastComma + 1).trim();
  } else {
    city = beforeState;
  }

  return {
    street, city, state, postalCode: zip,
    formatted: `${beforeState}, ${state} ${zip}`.trim(),
  };
}

// ============================================================================
// mailto/tel Link Helpers
// ============================================================================

export function extractMailtoEmails(pages: ScrapedPageInput[]): string[] {
  const emails: string[] = [];
  for (const page of pages) {
    const links = (page as unknown as Record<string, unknown>).mailtoLinks as string[] | undefined;
    if (links) for (const e of links) if (!shouldIgnoreEmail(e)) emails.push(e);
  }
  return [...new Set(emails)];
}

export function extractTelPhones(pages: ScrapedPageInput[]): string[] {
  const phones: string[] = [];
  for (const page of pages) {
    const links = (page as unknown as Record<string, unknown>).telLinks as string[] | undefined;
    if (links) for (const t of links) {
      const digits = t.replace(/\D/g, '');
      if (digits.length >= 7 && digits.length <= 15) phones.push(normalizePhone(t));
    }
  }
  return [...new Set(phones)];
}

// ============================================================================
// Main: Multi-Layer Contact Extraction
// ============================================================================

function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Extract contact methods from scraped pages.
 * Priority: JSON-LD > mailto/tel links > footer > body text regex.
 */
export function extractContactMethods(pages: ScrapedPageInput[]): ContactMethods {
  const allText = pages.map((p) => p.bodyText).join(' ');
  const allUrls = pages.flatMap((p) => p.links);
  const allJsonLd = pages.flatMap((p) => p.jsonLd || []);

  // ── Layer 1: JSON-LD ───────────────────────────────────────
  let bestPhone: string | null = null;
  let bestEmail: string | null = null;
  let bestAddress: ExtractedAddress | null = null;

  const businessTypes = [
    'LocalBusiness', 'Organization', 'Restaurant', 'Hotel', 'Store',
    'MedicalBusiness', 'HealthAndBeautyBusiness', 'FitnessCenter',
    'LodgingBusiness', 'FoodEstablishment', 'DentalClinic',
    'BarberShop', 'BeautySalon', 'DayCare', 'VeterinaryCare',
    'AutoDealer', 'AutoRepair', 'RealEstateAgent',
  ];

  for (const item of allJsonLd) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const items = Array.isArray(obj['@graph']) ? (obj['@graph'] as Record<string, unknown>[]) : [obj];

    for (const entity of items) {
      const type = entity['@type'] as string;
      if (!type || !businessTypes.some(t => type.includes(t))) continue;

      if (!bestPhone && entity.telephone) {
        const tel = String(entity.telephone);
        const digits = tel.replace(/\D/g, '');
        if (digits.length >= 7 && digits.length <= 15) bestPhone = normalizePhone(tel);
      }

      if (!bestEmail && entity.email) {
        const email = String(entity.email);
        if (!shouldIgnoreEmail(email)) bestEmail = email;
      }

      // ContactPoint array
      if (Array.isArray(entity.contactPoint)) {
        for (const cp of entity.contactPoint) {
          if (typeof cp !== 'object' || !cp) continue;
          const cpObj = cp as Record<string, unknown>;
          if (!bestPhone && cpObj.telephone) {
            const tel = String(cpObj.telephone);
            const digits = tel.replace(/\D/g, '');
            if (digits.length >= 7) bestPhone = normalizePhone(tel);
          }
          if (!bestEmail && cpObj.email) {
            const email = String(cpObj.email);
            if (!shouldIgnoreEmail(email)) bestEmail = email;
          }
        }
      }
    }
  }

  bestAddress = extractAddressFromJsonLd(allJsonLd);

  // ── Layer 2: mailto/tel links ──────────────────────────────
  const mailtoEmails = extractMailtoEmails(pages);
  const telPhones = extractTelPhones(pages);
  if (!bestEmail && mailtoEmails.length > 0) bestEmail = mailtoEmails[0];
  if (!bestPhone && telPhones.length > 0) bestPhone = telPhones[0];

  // ── Layer 3: Footer contacts ───────────────────────────────
  for (const page of pages) {
    const fc = (page as unknown as Record<string, unknown>).footerContacts as { phones?: string[]; emails?: string[]; addresses?: string[] } | undefined;
    if (!fc) continue;
    if (!bestPhone && fc.phones?.length) {
      const valid = extractPhones(fc.phones.join(' '));
      if (valid.length > 0) bestPhone = valid[0];
    }
    if (!bestEmail && fc.emails?.length) {
      const valid = extractEmails(fc.emails.join(' '));
      if (valid.length > 0) bestEmail = valid[0];
    }
    if (!bestAddress && fc.addresses?.length) {
      bestAddress = { formatted: fc.addresses[0] };
    }
  }

  // ── Layer 4: Body text regex ───────────────────────────────
  if (!bestEmail) {
    const found = extractEmails(allText);
    if (found.length > 0) bestEmail = found[0];
  }
  if (!bestPhone) {
    const found = extractPhones(allText);
    if (found.length > 0) bestPhone = found[0];
  }
  if (!bestAddress) {
    bestAddress = extractAddressFromText(allText);
  }

  // ── Detect form, chat, social ──────────────────────────────
  const hasForm = matchesPatterns(allText, [...DETECTION_PATTERNS.contact.form]);
  const hasChat = matchesPatterns(allText, [...DETECTION_PATTERNS.contact.chat]);
  const social: string[] = [];
  for (const [platform, pattern] of Object.entries(DETECTION_PATTERNS.contact.social)) {
    if (allUrls.some((url) => pattern.test(url))) social.push(platform);
  }

  return {
    form: hasForm,
    email: bestEmail,
    phone: bestPhone,
    chat: hasChat,
    social,
    address: bestAddress || undefined,
  };
}
