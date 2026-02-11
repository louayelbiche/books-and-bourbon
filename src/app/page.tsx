import { fetchEvents, type CMSEvent } from '@/lib/cms'
import { HomeClient } from './HomeClient'

// Static fallback data
const fallbackFeaturedEvent: CMSEvent = {
  id: '1',
  title: 'The Art of Storytelling',
  slug: 'the-art-of-storytelling',
  authorName: 'James Morrison',
  bookTitle: 'Whispers in the Dark',
  bookId: null,
  book: null,
  eventDate: '2026-02-15',
  startTime: null,
  endTime: null,
  duration: null,
  thumbnailUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
  videoUrl: 'https://www.youtube.com/watch?v=atljnarLMh4',
  location: null,
  status: 'recorded' as const,
  isFeatured: true,
  metadata: null,
  description: null,
}

const fallbackUpcomingEvents: CMSEvent[] = [
  {
    id: '2',
    title: 'Mystery Unraveled',
    slug: 'mystery-unraveled',
    authorName: 'Sarah Chen',
    bookTitle: null,
    bookId: null,
    book: null,
    eventDate: '2026-02-22',
    startTime: null,
    endTime: null,
    duration: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    videoUrl: null,
    location: null,
    status: 'scheduled' as const,
    isFeatured: false,
    metadata: null,
    description: null,
  },
]

export const revalidate = 3600

export default async function HomePage() {
  const allEvents = await fetchEvents({ limit: 10 })

  let featuredEvent = fallbackFeaturedEvent
  let upcomingEvents = fallbackUpcomingEvents

  if (allEvents.length > 0) {
    const featured = allEvents.find((e) => e.isFeatured) || allEvents[0]
    featuredEvent = featured
    upcomingEvents = allEvents.filter((e) => e.id !== featured.id).slice(0, 3)
  }

  return <HomeClient featuredEvent={featuredEvent} upcomingEvents={upcomingEvents} />
}
