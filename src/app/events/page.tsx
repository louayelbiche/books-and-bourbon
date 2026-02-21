import { fetchEvents, fetchPageContent, DEFAULT_PAGE_CONTENT, CMSEvent } from '@/lib/cms'
import { EventsClient } from './EventsClient'
import { fallbackEvents } from './fallback'

export const revalidate = 3600

export default async function EventsPage() {
  const [cmsEvents, pageContent] = await Promise.all([
    fetchEvents(),
    fetchPageContent(),
  ])
  const events: CMSEvent[] = cmsEvents.length > 0 ? cmsEvents : fallbackEvents
  const today = new Date().toISOString().split('T')[0]
  const header = pageContent.events?.header || DEFAULT_PAGE_CONTENT.events.header

  return <EventsClient events={events} today={today} header={header} />
}
