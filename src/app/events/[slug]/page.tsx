import type { Metadata } from 'next'
import { fetchEvents } from '@/lib/cms'
import { fallbackEvents } from '../fallback'
import { notFound } from 'next/navigation'
import { EventDetail } from './EventDetail'

const BASE_URL = 'https://books.runwellsystems.com'

export const revalidate = 3600

export async function generateStaticParams() {
  return fallbackEvents.map((e) => ({ slug: e.slug }))
}

async function getEvent(slug: string) {
  const cmsEvents = await fetchEvents()
  const events = cmsEvents.length > 0 ? cmsEvents : fallbackEvents
  return events.find((e) => e.slug === slug) ?? fallbackEvents.find((e) => e.slug === slug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) return {}

  const title = `${event.title} | Books and Bourbon`
  const description = event.description || `${event.title} — a Books and Bourbon event`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${BASE_URL}/events/${event.slug}/`,
      images: event.thumbnailUrl ? [{ url: event.thumbnailUrl, width: 800, height: 450 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: event.thumbnailUrl ? [event.thumbnailUrl] : undefined,
    },
  }
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getEvent(slug)

  if (!event) {
    notFound()
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startTime ? `${event.eventDate}T${event.startTime}` : event.eventDate,
    endDate: event.endTime ? `${event.eventDate}T${event.endTime}` : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: 'Books and Bourbon',
      url: BASE_URL,
    },
    performer: event.authorName ? { '@type': 'Person', name: event.authorName } : undefined,
    image: event.thumbnailUrl,
    url: `${BASE_URL}/events/${event.slug}/`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetail event={event} />
    </>
  )
}
