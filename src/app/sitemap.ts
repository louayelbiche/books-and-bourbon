import type { MetadataRoute } from 'next'
import { fallbackEvents } from './events/fallback'

const BASE_URL = 'https://books.runwellsystems.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/events/`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/books/`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/about/`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/faq/`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact/`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const eventPages: MetadataRoute.Sitemap = fallbackEvents.map((event) => ({
    url: `${BASE_URL}/events/${event.slug}/`,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...eventPages]
}
