'use client'

import Image from 'next/image'
import { Icon } from '@iconify/react'
import { useState } from 'react'

// Sample data - replace with real data
const events = [
  {
    id: 1,
    title: 'The Art of Storytelling',
    author: 'James Morrison',
    book: 'Whispers in the Dark',
    date: 'February 15, 2026',
    duration: '58:23',
    thumbnail: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'A deep dive into narrative techniques and the craft of building suspense.',
    status: 'recorded',
  },
  {
    id: 2,
    title: 'Poetry in the Modern Age',
    author: 'Michael Torres',
    book: 'River of Time',
    date: 'February 8, 2026',
    duration: '45:17',
    thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Exploring contemporary poetry and its relevance in the digital age.',
    status: 'recorded',
  },
  {
    id: 3,
    title: 'Building Worlds',
    author: 'Elena Volkov',
    book: 'Stardust Memory',
    date: 'January 25, 2026',
    duration: '1:02:45',
    thumbnail: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    description: 'Science fiction world-building and the intersection of science and imagination.',
    status: 'recorded',
  },
  {
    id: 4,
    title: 'Mystery Unraveled',
    author: 'Sarah Chen',
    book: 'The Last Garden',
    date: 'February 22, 2026',
    thumbnail: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
    description: 'Join us for a conversation about literary mysteries and plot construction.',
    status: 'upcoming',
  },
  {
    id: 5,
    title: 'Historical Fiction Deep Dive',
    author: 'Robert Williams',
    book: 'Echoes of Empire',
    date: 'March 1, 2026',
    thumbnail: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
    description: 'Balancing historical accuracy with compelling fiction.',
    status: 'upcoming',
  },
]

type FilterStatus = 'all' | 'recorded' | 'upcoming'

export default function EventsPage() {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedVideo, setSelectedVideo] = useState<typeof events[0] | null>(null)

  const filteredEvents = events.filter((event) =>
    filter === 'all' ? true : event.status === filter
  )

  const recordedCount = events.filter((e) => e.status === 'recorded').length
  const upcomingCount = events.filter((e) => e.status === 'upcoming').length

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-16 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
            Watch & Listen
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-brand-cream mb-6">
            Events
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Explore our archive of recorded conversations and stay updated on upcoming episodes.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="bg-surface border-y border-text-muted/10 sticky top-[72px] z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setFilter('all')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                filter === 'all'
                  ? 'border-brand-burgundy text-brand-cream'
                  : 'border-transparent text-text-secondary hover:text-brand-cream'
              }`}
            >
              All Episodes ({events.length})
            </button>
            <button
              onClick={() => setFilter('recorded')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                filter === 'recorded'
                  ? 'border-brand-burgundy text-brand-cream'
                  : 'border-transparent text-text-secondary hover:text-brand-cream'
              }`}
            >
              Recorded ({recordedCount})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                filter === 'upcoming'
                  ? 'border-brand-burgundy text-brand-cream'
                  : 'border-transparent text-text-secondary hover:text-brand-cream'
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-16 md:py-24 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="group bg-surface card-hover overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="aspect-video relative overflow-hidden">
                  <Image
                    src={event.thumbnail}
                    alt={event.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-brand-black/40" />

                  {event.status === 'recorded' ? (
                    <button
                      onClick={() => setSelectedVideo(event)}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-16 h-16 bg-brand-burgundy rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                        <Icon icon="mdi:play" className="w-8 h-8 text-brand-cream ml-1" />
                      </div>
                    </button>
                  ) : (
                    <div className="absolute top-4 right-4 bg-brand-gold px-3 py-1 text-sm font-medium text-brand-black">
                      Coming Soon
                    </div>
                  )}

                  {event.duration && (
                    <div className="absolute bottom-4 right-4 bg-brand-black/80 px-2 py-1 text-xs text-brand-cream">
                      {event.duration}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-4 text-text-muted text-sm mb-3">
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:calendar" className="w-4 h-4" />
                      {event.date}
                    </span>
                    {event.status === 'recorded' && (
                      <span className="flex items-center gap-1">
                        <Icon icon="mdi:check-circle" className="w-4 h-4 text-green-500" />
                        Recorded
                      </span>
                    )}
                  </div>

                  <h2 className="font-display text-2xl text-brand-cream mb-2 group-hover:text-brand-gold transition-colors">
                    {event.title}
                  </h2>

                  <p className="text-text-secondary text-sm mb-4">
                    with <span className="text-brand-cream">{event.author}</span>
                    {' '}discussing &ldquo;{event.book}&rdquo;
                  </p>

                  <p className="text-text-muted text-sm line-clamp-2">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-16">
              <Icon icon="mdi:video-off" className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">No events found for this filter.</p>
            </div>
          )}
        </div>
      </section>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 bg-brand-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display text-2xl text-brand-cream">
                  {selectedVideo.title}
                </h3>
                <p className="text-text-secondary">
                  with {selectedVideo.author}
                </p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 text-text-secondary hover:text-brand-cream transition-colors"
              >
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>
            </div>

            <div className="aspect-video bg-surface">
              <iframe
                src={selectedVideo.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="mt-4 p-4 bg-surface">
              <p className="text-text-secondary">
                {selectedVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
