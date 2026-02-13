import { saveSnapshot, loadSnapshot } from './cms-snapshot';

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
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      headers: { 'x-api-key': CMS_API_KEY },
      next: { revalidate: options.revalidate ?? 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`CMS API error: ${response.status} for ${path}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`CMS fetch failed for ${path}:`, error);
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
  const result = await cmsGet<EventsResponse>(path);
  if (result) {
    saveSnapshot('events', result.data);
    return result.data;
  }
  return loadSnapshot<CMSEvent[]>('events') ?? [];
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
  const result = await cmsGet<BooksResponse>(path);
  if (result) {
    saveSnapshot('books', result.data);
    return result.data;
  }
  return loadSnapshot<CMSBook[]>('books') ?? [];
}

export async function fetchFAQs(params?: {
  category?: string;
}): Promise<CMSFAQ[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);

  const qs = searchParams.toString();
  const path = `/api/cms/v1/faqs${qs ? `?${qs}` : ''}`;
  const result = await cmsGet<FAQsResponse>(path);
  if (result) {
    saveSnapshot('faqs', result.data);
    return result.data;
  }
  return loadSnapshot<CMSFAQ[]>('faqs') ?? [];
}

export async function fetchContent(type: string): Promise<Record<string, unknown>[]> {
  const path = `/api/cms/v1/content/${type}`;
  const result = await cmsGet<ContentResponse>(path);
  if (result) {
    saveSnapshot(`content-${type}`, result.data);
    return result.data;
  }
  return loadSnapshot<Record<string, unknown>[]>(`content-${type}`) ?? [];
}
