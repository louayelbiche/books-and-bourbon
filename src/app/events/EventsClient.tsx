'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import type { CMSEvent } from '@/lib/cms'

type FilterStatus = 'all' | 'upcoming' | 'past'

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export function EventsClient({ events, today, header }: { events: CMSEvent[]; today: string; header?: { eyebrow: string; title: string; description: string } }) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const isPastEvent = (event: CMSEvent) => event.eventDate < today

  const upcomingEvents = events
    .filter((e) => !isPastEvent(e))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const pastEvents = events
    .filter((e) => isPastEvent(e))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))

  const filteredEvents =
    filter === 'upcoming' ? upcomingEvents
    : filter === 'past' ? pastEvents
    : [...upcomingEvents, ...pastEvents]

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-16 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
            {header?.eyebrow || 'Watch & Listen'}
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-brand-cream mb-6">
            {header?.title || 'Events'}
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            {header?.description || 'Explore our archive of recorded conversations and stay updated on upcoming episodes.'}
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="bg-surface border-y border-text-muted/10 sticky top-16 sm:top-[72px] z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 sm:gap-8 overflow-x-auto scrollbar-hide">
            {([
              ['all', `All Episodes (${events.length})`],
              ['upcoming', `Upcoming (${upcomingEvents.length})`],
              ['past', `Past Reads (${pastEvents.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  filter === key
                    ? 'border-brand-burgundy text-brand-cream'
                    : 'border-transparent text-text-secondary hover:text-brand-cream'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events List */}
      <section className="py-16 md:py-24 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col gap-6">
            {filteredEvents.map((event, index) => {
              const videoId = event.videoUrl ? extractYouTubeId(event.videoUrl) : null
              const thumbnailSrc = event.thumbnailUrl
                || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null)
              const past = isPastEvent(event)

              // Show "Past Reads" divider in "all" tab between upcoming and past sections
              const showDivider = filter === 'all'
                && past
                && upcomingEvents.length > 0
                && index === upcomingEvents.length

              return (
                <div key={event.id}>
                  {showDivider && (
                    <div className="flex items-center gap-4 my-8">
                      <div className="h-px flex-1 bg-text-muted/20" />
                      <span className="text-text-secondary text-sm font-medium uppercase tracking-wider whitespace-nowrap">Past Reads</span>
                      <div className="h-px flex-1 bg-text-muted/20" />
                    </div>
                  )}
                  <Link
                    href={`/events/${event.slug}`}
                    className={`group bg-surface card-hover overflow-hidden grid grid-cols-1 md:grid-cols-2 ${
                      past ? 'opacity-60 hover:opacity-80' : ''
                    }`}
                  >
                    {/* Thumbnail — left side */}
                    <div className="relative overflow-hidden aspect-video">
                      {thumbnailSrc ? (
                        <Image
                          src={thumbnailSrc}
                          alt={event.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-elevated" />
                      )}
                      <div className="absolute inset-0 bg-brand-black/40" />

                      {event.status === 'recorded' && videoId ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 bg-brand-burgundy rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                            <Icon icon="mdi:play" className="w-7 h-7 text-brand-cream ml-0.5" />
                          </div>
                        </div>
                      ) : !past && event.status !== 'recorded' ? (
                        <div className="absolute top-4 right-4 bg-brand-gold px-3 py-1 text-sm font-medium text-brand-black">
                          Coming Soon
                        </div>
                      ) : null}

                      {event.duration && (
                        <div className="absolute bottom-3 right-3 bg-brand-black/80 px-2 py-1 text-xs text-brand-cream">
                          {event.duration}
                        </div>
                      )}
                    </div>

                    {/* Content — right side */}
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-4 text-brand-tan/70 text-sm mb-3">
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:calendar" className="w-4 h-4" />
                            {new Date(event.eventDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                          {event.status === 'recorded' && (
                            <span className="flex items-center gap-1">
                              <Icon icon="mdi:check-circle" className="w-4 h-4 text-brand-gold" />
                              Recorded
                            </span>
                          )}
                        </div>

                        <h2 className="font-display text-xl md:text-2xl text-brand-cream mb-2 group-hover:text-brand-gold transition-colors">
                          {event.title}
                        </h2>

                        {event.hostName && (
                          <p className="text-brand-tan text-sm mb-1">
                            hosted by <span className="text-brand-cream">{event.hostName}</span>
                          </p>
                        )}
                        {event.bookTitle && (
                          <p className="text-brand-tan/70 text-xs mb-3">
                            discussing &ldquo;{event.bookTitle}&rdquo;{event.authorName && <> by {event.authorName}</>}
                          </p>
                        )}

                        {event.description && (
                          <p className="text-brand-tan/70 text-sm line-clamp-2 md:line-clamp-3">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-16">
              <Icon icon="mdi:video-off" className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">No events found for this filter.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
