import { fetchEvents, type CMSEvent } from '@/lib/cms'
import { fallbackEvents } from './events/fallback'
import { HomeClient } from './HomeClient'

// Static fallback data
const fallbackFeaturedEvent: CMSEvent = {
  id: 'past-1',
  title: 'Building an Empire from Nothing',
  slug: 'building-an-empire-from-nothing',
  hostName: 'Jessica Schaefer',
  authorName: 'Phil Knight',
  bookTitle: 'Shoe Dog',
  bookId: 'book-shoe-dog',
  book: {
    id: 'book-shoe-dog',
    title: 'Shoe Dog',
    author: 'Phil Knight',
    coverImageUrl: 'https://covers.openlibrary.org/b/isbn/9781501135927-L.jpg',
    purchaseUrl: null,
    genre: 'Memoir / Business',
    description: 'The candid, riveting memoir of the founder of Nike.',
  },
  eventDate: '2026-01-25',
  startTime: '19:00',
  endTime: '20:15',
  duration: '1:12:40',
  thumbnailUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=800',
  videoUrl: 'https://www.youtube.com/watch?v=atljnarLMh4',
  location: null,
  status: 'recorded' as const,
  isFeatured: false,
  metadata: null,
  description: "Phil Knight's raw account of building Nike from a $50 loan and a handshake deal with a Japanese shoe company.",
}

const fallbackUpcomingEvents: CMSEvent[] = [
  {
    id: 'upcoming-1',
    title: 'The Art of Radical Generosity',
    slug: 'the-art-of-radical-generosity',
    hostName: 'Jessica Schaefer',
    authorName: 'Will Guidara',
    bookTitle: 'Unreasonable Hospitality',
    bookId: null,
    book: null,
    eventDate: '2026-02-22',
    startTime: '19:00',
    endTime: '20:30',
    duration: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800',
    videoUrl: null,
    location: null,
    status: 'scheduled' as const,
    isFeatured: true,
    metadata: null,
    description: 'Will Guidara joins us to explore the philosophy behind world-class service.',
  },
  {
    id: 'upcoming-2',
    title: 'What Never Changes',
    slug: 'what-never-changes',
    hostName: 'Christine Park',
    authorName: 'Morgan Housel',
    bookTitle: 'Same as Ever',
    bookId: null,
    book: null,
    eventDate: '2026-03-08',
    startTime: '19:00',
    endTime: '20:30',
    duration: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
    videoUrl: null,
    location: null,
    status: 'scheduled' as const,
    isFeatured: false,
    metadata: null,
    description: 'Morgan Housel makes the contrarian case: the most powerful insights come from what stays the same.',
  },
]

export const revalidate = 3600

export default async function HomePage() {
  const cmsEvents = await fetchEvents({ limit: 20 })
  const allEvents = cmsEvents.length > 0 ? cmsEvents : fallbackEvents

  const today = new Date().toISOString().split('T')[0]

  // Featured = most recent recorded event (has video / play button)
  const recorded = allEvents
    .filter((e) => e.eventDate < today)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
  const featuredEvent = recorded[0] || fallbackFeaturedEvent

  const upcomingEvents = allEvents
    .filter((e) => e.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, 3)
  const pastEvents = recorded
    .filter((e) => e.id !== featuredEvent.id)
    .slice(0, 3)

  return <HomeClient featuredEvent={featuredEvent} upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
}
