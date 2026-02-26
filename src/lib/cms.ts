import { snapshotFirst } from '@runwell/cms-snapshot';
import { createLogger, logError } from '@runwell/logger';

const logger = createLogger('cms');

const CMS_API_URL = process.env.CMS_API_URL || '';
const CMS_API_KEY = process.env.CMS_API_KEY || '';

interface FetchOptions {
  revalidate?: number;
}

async function cmsGet<T>(path: string, options: FetchOptions = {}): Promise<T | null> {
  if (!CMS_API_URL || !CMS_API_KEY) {
    return null;
  }

  try {
    const url = `${CMS_API_URL}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(url, {
      headers: { 'x-api-key': CMS_API_KEY },
      next: { revalidate: options.revalidate ?? 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.error('CMS API error', { status: response.status, path });
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error('CMS fetch failed', { path, ...logError(error) });
    return null;
  }
}

export interface CMSBook {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  genre: string | null;
  description: string | null;
  coverImageUrl: string | null;
  purchaseUrl: string | null;
  status: 'published';
  isFeatured: boolean;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
}

export interface CMSEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  hostName: string | null;
  authorName: string | null;
  bookTitle: string | null;
  bookId: string | null;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImageUrl: string | null;
    purchaseUrl: string | null;
    genre: string | null;
    description: string | null;
  } | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  duration: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  location: string | null;
  status: 'scheduled' | 'recorded';
  isFeatured: boolean;
  metadata: Record<string, unknown> | null;
}

export interface CMSFAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
}

interface FAQsResponse {
  data: CMSFAQ[];
  meta: { total: number };
}

interface BooksResponse {
  data: CMSBook[];
  meta: { total: number };
}

interface EventsResponse {
  data: CMSEvent[];
  meta: { total: number };
}

interface ContentResponse {
  data: Record<string, unknown>[];
  meta: { total: number };
}

export async function fetchEvents(params?: {
  status?: 'scheduled' | 'recorded';
  featured?: boolean;
  limit?: number;
}): Promise<CMSEvent[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.featured) searchParams.set('featured', 'true');
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  const path = `/api/cms/v1/events${qs ? `?${qs}` : ''}`;

  return await snapshotFirst<CMSEvent[]>('events', async () => {
    const result = await cmsGet<EventsResponse>(path);
    return result?.data ?? null;
  }) ?? [];
}

export async function fetchBooks(params?: {
  genre?: string;
  featured?: boolean;
  limit?: number;
}): Promise<CMSBook[]> {
  const searchParams = new URLSearchParams();
  if (params?.genre) searchParams.set('genre', params.genre);
  if (params?.featured) searchParams.set('featured', 'true');
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  const path = `/api/cms/v1/books${qs ? `?${qs}` : ''}`;

  return await snapshotFirst<CMSBook[]>('books', async () => {
    const result = await cmsGet<BooksResponse>(path);
    return result?.data ?? null;
  }) ?? [];
}

export async function fetchFAQs(params?: {
  category?: string;
}): Promise<CMSFAQ[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);

  const qs = searchParams.toString();
  const path = `/api/cms/v1/faqs${qs ? `?${qs}` : ''}`;

  return await snapshotFirst<CMSFAQ[]>('faqs', async () => {
    const result = await cmsGet<FAQsResponse>(path);
    return result?.data ?? null;
  }) ?? [];
}

export async function fetchContent(type: string): Promise<Record<string, unknown>[]> {
  return await snapshotFirst<Record<string, unknown>[]>(`content-${type}`, async () => {
    const result = await cmsGet<ContentResponse>(`/api/cms/v1/content/${type}`);
    return result?.data ?? null;
  }) ?? [];
}

// --- Site Images ---

export interface CMSTeamPhoto {
  name: string;
  role: string;
  imageUrl: string;
  bio?: string;
  photoPosition?: string;
}

export interface CMSSiteImages {
  heroBackground: string;
  ogImage: string;
  aboutHeroImage: string;
  ctaBackground: string;
  teamPhotos: CMSTeamPhoto[];
}

interface SiteImagesResponse {
  data: CMSSiteImages;
}

const DEFAULT_SITE_IMAGES: CMSSiteImages = {
  heroBackground: '',
  ogImage: '',
  aboutHeroImage: '',
  ctaBackground: '',
  teamPhotos: [],
};

export async function fetchSiteImages(): Promise<CMSSiteImages> {
  return await snapshotFirst<CMSSiteImages>('site-images', async () => {
    const result = await cmsGet<SiteImagesResponse>('/api/cms/v1/site-images');
    return result?.data ?? null;
  }) ?? DEFAULT_SITE_IMAGES;
}

// --- Page Content ---

export interface CMSPageContent {
  home: {
    hero: { eyebrow: string; title: string; subtitle: string; primaryCTA: string; secondaryCTA: string };
    suggestBook: { eyebrow: string; title: string; paragraph: string; buttonText: string };
  };
  about: {
    hero: { eyebrow: string; title: string; description: string };
    mission: { heading: string; paragraphs: string[]; statValue: string; statLabel: string };
    stats: Array<{ value: string; label: string }>;
    team: { eyebrow: string; heading: string };
    values: {
      eyebrow: string;
      heading: string;
      cards: Array<{ icon: string; title: string; description: string }>;
    };
    cta: { heading: string; description: string; buttonText: string };
  };
  events: { header: { eyebrow: string; title: string; description: string } };
  books: { header: { eyebrow: string; title: string; description: string } };
  faq: {
    header: { eyebrow: string; title: string; description: string };
    cta: { heading: string; description: string; buttonText: string };
  };
  contact: {
    header: { eyebrow: string; title: string; description: string };
    formHeading: string;
    contactInfo: { email: string; addressLine1: string; addressLine2: string; responseTime: string };
    social: {
      heading: string;
      links: Array<{ platform: string; url: string; icon: string }>;
    };
  };
}

interface PageContentResponse {
  data: CMSPageContent;
}

export const DEFAULT_PAGE_CONTENT: CMSPageContent = {
  home: {
    hero: {
      eyebrow: 'Literary Conversations',
      title: 'Books and Bourbon',
      subtitle: 'An author-led series featuring moderated conversations on literature, ideas, and craft.',
      primaryCTA: 'View Events',
      secondaryCTA: 'Contact Us',
    },
    suggestBook: {
      eyebrow: 'Your Turn',
      title: 'Got a Book We Should Read?',
      paragraph: 'The best conversations start with great recommendations.\nTell us what book deserves a seat at the table.',
      buttonText: 'Suggest a Book',
    },
  },
  about: {
    hero: {
      eyebrow: 'Our Story',
      title: 'Where Literature Meets Conversation',
      description: 'Books and Bourbon began with a simple idea: bring readers closer to the authors they love through intimate, thoughtful conversations.',
    },
    mission: {
      heading: 'Our Mission',
      paragraphs: [
        'In an age of endless content, we believe in the power of deep, meaningful conversations about literature. Our mission is to create a space where authors can share not just their work, but their creative process, inspirations, and the stories behind the stories.',
        'Every episode is a carefully curated experience, designed to give our audience insights they cannot find anywhere else. We pair each discussion with a carefully selected bourbon, creating an atmosphere of warmth and sophistication.',
        "Whether you're a dedicated bibliophile or simply curious about the world of books, Books and Bourbon offers a unique window into the minds of today's most compelling writers.",
      ],
      statValue: '5+',
      statLabel: 'Years of Stories',
    },
    stats: [
      { value: '50+', label: 'Episodes Recorded' },
      { value: '40+', label: 'Authors Featured' },
      { value: '100K+', label: 'Community Members' },
      { value: '25+', label: 'Partner Publishers' },
    ],
    team: {
      eyebrow: 'The Hosts',
      heading: 'Meet the Team',
    },
    values: {
      eyebrow: 'What Drives Us',
      heading: 'Our Values',
      cards: [
        {
          icon: 'mdi:book-open-variant',
          title: 'Literary Excellence',
          description: 'We curate only the finest works and most compelling authors, ensuring every episode offers genuine literary value.',
        },
        {
          icon: 'mdi:account-group',
          title: 'Community First',
          description: 'Our audience is at the heart of everything we do. We actively seek and incorporate community feedback and suggestions.',
        },
        {
          icon: 'mdi:microphone',
          title: 'Authentic Voices',
          description: 'We create an environment where authors feel comfortable sharing their true selves, beyond the polished public persona.',
        },
      ],
    },
    cta: {
      heading: 'Join the Conversation',
      description: "Have a book you'd love us to feature? An author you think our audience would enjoy? We want to hear from you.",
      buttonText: 'Get in Touch',
    },
  },
  events: {
    header: {
      eyebrow: 'Watch & Listen',
      title: 'Events',
      description: 'Explore our archive of recorded conversations and stay updated on upcoming episodes.',
    },
  },
  books: {
    header: {
      eyebrow: 'Our Library',
      title: 'Featured Books',
      description: 'Discover the books discussed in our sessions. Each title has been carefully selected for its literary merit and conversation-worthy themes.',
    },
  },
  faq: {
    header: {
      eyebrow: 'Help Center',
      title: 'Frequently Asked Questions',
      description: 'Find answers to common questions about Books and Bourbon, our events, and how to get involved.',
    },
    cta: {
      heading: 'Still Have Questions?',
      description: "Can't find what you're looking for? We'd love to hear from you.",
      buttonText: 'Contact Us',
    },
  },
  contact: {
    header: {
      eyebrow: 'Get in Touch',
      title: 'Contact Us',
      description: "Have a book suggestion, partnership inquiry, or just want to say hello? We'd love to hear from you.",
    },
    formHeading: 'Send Us a Message',
    contactInfo: {
      email: 'info@capvstrategies.com',
      addressLine1: '40 Thompson Street, Floor 6',
      addressLine2: 'New York, NY 10013',
      responseTime: 'We respond within 48 hours',
    },
    social: {
      heading: 'Follow Us',
      links: [
        { platform: 'Instagram', url: 'https://www.instagram.com/capvstrategies/', icon: 'mdi:instagram' },
        { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/capitalvstrategies', icon: 'mdi:linkedin' },
      ],
    },
  },
};

export async function fetchPageContent(): Promise<CMSPageContent> {
  return await snapshotFirst<CMSPageContent>('page-content', async () => {
    const result = await cmsGet<PageContentResponse>('/api/cms/v1/page-content');
    return result?.data ?? null;
  }) ?? DEFAULT_PAGE_CONTENT;
}
