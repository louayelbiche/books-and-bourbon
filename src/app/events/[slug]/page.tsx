import { fetchEvents } from '@/lib/cms'
import { fallbackEvents } from '../fallback'
import { notFound } from 'next/navigation'
import { EventDetail } from './EventDetail'

export const revalidate = 3600

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cmsEvents = await fetchEvents()
  const events = cmsEvents.length > 0 ? cmsEvents : fallbackEvents
  const event = events.find((e) => e.slug === slug)

  if (!event) {
    notFound()
  }

  return <EventDetail event={event} />
}
