/**
 * Scraper Constants
 *
 * Configuration constants for the web scraper.
 */

import type { ScraperOptions } from './types.js';

/**
 * Default scraper options.
 */
export const DEFAULT_OPTIONS: ScraperOptions = {
  maxInternalPages: 20,
  maxExternalPages: 5,
  followExternalLinks: true,
  maxContentChars: 75000,
  stealth: true,
};

/**
 * User agent string for HTTP requests.
 */
export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Full browser-like headers for fetch requests.
 * Exported for consumers that need to make their own requests with realistic headers.
 */
export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

/**
 * Delay between requests to avoid overwhelming servers.
 */
export const CRAWL_DELAY_MS = 300;

/**
 * Request timeout in milliseconds.
 */
export const REQUEST_TIMEOUT_MS = 15000;

/**
 * External domains worth scraping for additional context.
 */
export const VALUABLE_EXTERNAL_DOMAINS = [
  // Social media
  'linkedin.com',
  'twitter.com',
  'x.com',
  'github.com',
  'medium.com',
  'facebook.com',
  'instagram.com',
  // Review sites
  'crunchbase.com',
  'yelp.com',
  'trustpilot.com',
  'g2.com',
  'capterra.com',
  // B2B equipment manufacturers
  'edan.com',
  'mindray.com',
  'thermofisher.com',
  'abbott.com',
  'corelaboratory.abbott',
  'nuve.com.tr',
  'beckman.com',
  'siemens-healthineers.com',
  'roche.com',
  'sysmex.com',
  'bio-rad.com',
  'beckmancoulter.com',
  'agilent.com',
  'perkinelmer.com',
];

/**
 * URL path patterns that indicate product/service pages.
 * Used for priority crawling — URLs matching these are crawled first.
 * Includes bilingual EN/FR patterns.
 */
export const PRODUCT_URL_PATTERNS = [
  '/products',
  '/product',
  '/produits',
  '/collections',
  '/shop',
  '/store',
  '/catalog',
  '/catalogue',
  '/services',
  '/equipment',
  '/equipements',
  '/solutions',
  '/pricing',
  '/tarifs',
  '/categories',
  '/category',
  '/offerings',
  '/inventory',
  '/items',
  '/brands',
  '/marques',
  '/our-products',
  '/our-services',
  '/nos-produits',
  '/nos-services',
];

/**
 * URL path patterns for content pages worth crawling.
 * Used for link discovery — pages matching these are always followed.
 * Includes bilingual EN/FR patterns.
 */
export const CONTENT_URL_PATTERNS = [
  /\/(about|a-propos|qui-sommes-nous)/i,
  /\/(products?|produits?|services?)/i,
  /\/(contact|nous-contacter)/i,
  /\/(team|equipe|company|entreprise)/i,
  /\/(solutions?|offerings?)/i,
  /\/(catalog|catalogue|inventory|items)/i,
  /\/(equipment|equipements?)/i,
  /\/(pricing|tarifs?|plans?)/i,
  /\/(features?|fonctionnalites?)/i,
  /\/(brands?|marques?)/i,
  /\/(faq|help|aide)/i,
  /\/(mission|vision|values|valeurs)/i,
  /\/(how-it-works|comment-ca-marche)/i,
];

/**
 * File extensions to skip during crawling.
 */
export const SKIP_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.svg',
  '.webp',
  '.mp4',
  '.mp3',
  '.wav',
  '.avi',
  '.mov',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.exe',
  '.dmg',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
];

/**
 * URL paths to skip (authentication, admin, etc.).
 */
export const SKIP_PATHS = [
  '/login',
  '/signin',
  '/signup',
  '/register',
  '/logout',
  '/cart',
  '/checkout',
  '/account',
  '/admin',
  '/wp-admin',
  '/wp-login',
  '/auth',
  '/oauth',
  '/password',
  '/reset',
  '/unsubscribe',
  '/print',
  '/share',
];

/**
 * Domains to skip entirely (video platforms, etc.).
 */
export const SKIP_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'dailymotion.com',
  'tiktok.com',
  'twitch.tv',
];

/**
 * Country and region identifiers to filter out of business names.
 */
export const REGION_IDENTIFIERS = [
  // Country codes
  'u.s.',
  'us',
  'usa',
  'uk',
  'eu',
  'uae',
  'ca',
  'au',
  'de',
  'fr',
  'jp',
  'cn',
  'in',
  'br',
  // Country/region names
  'united states',
  'united kingdom',
  'australia',
  'canada',
  'germany',
  'france',
  'japan',
  'china',
  'india',
  'brazil',
  'europe',
  'asia',
  'americas',
  'global',
  'worldwide',
  'international',
];

/**
 * Generic phrases to filter out of business names.
 */
export const GENERIC_PHRASES = [
  // Common descriptors
  'home',
  'welcome',
  'official',
  'website',
  'site',
  'free',
  'online',
  'software',
  'platform',
  'solution',
  'the',
  'best',
  'top',
  '#1',
  'company',
  'service',
  'services',
  'app',
  'tool',
  'application',
  // Connectors
  'your',
  'for',
  'and',
  'with',
  'of',
  'in',
  'a',
  'an',
  // Industry terms
  'note',
  'taking',
  'domain',
  'domains',
  'names',
  'email',
  'buy',
  'get',
  'create',
  'build',
  'make',
  'start',
];
