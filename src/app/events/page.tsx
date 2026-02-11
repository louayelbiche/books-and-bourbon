import { fetchEvents, CMSEvent } from '@/lib/cms'
import { EventsClient } from './EventsClient'
import { fallbackEvents } from './fallback'

export const revalidate = 3600

export default async function EventsPage() {
  const cmsEvents = await fetchEvents()
  const events: CMSEvent[] = cmsEvents.length > 0 ? cmsEvents : fallbackEvents

  return <EventsClient events={events} />
}
