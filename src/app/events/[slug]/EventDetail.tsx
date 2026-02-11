'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import type { CMSEvent } from '@/lib/cms'

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

export function EventDetail({ event }: { event: CMSEvent }) {
  const videoId = event.videoUrl ? extractYouTubeId(event.videoUrl) : null

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-8 bg-brand-black">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-brand-tan/70 text-sm hover:text-brand-cream transition-colors mb-8"
          >
            <Icon icon="mdi:arrow-left" className="w-4 h-4" />
            All Events
          </Link>

          <div className="flex items-center gap-4 text-brand-tan/70 text-sm mb-4">
            <span className="flex items-center gap-1.5">
              <Icon icon="mdi:calendar" className="w-4 h-4" />
              {new Date(event.eventDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {event.status === 'recorded' && (
              <span className="flex items-center gap-1.5">
                <Icon icon="mdi:check-circle" className="w-4 h-4 text-brand-gold" />
                Recorded
              </span>
            )}
            {event.duration && (
              <span className="flex items-center gap-1.5">
                <Icon icon="mdi:clock-outline" className="w-4 h-4" />
                {event.duration}
              </span>
            )}
          </div>

          <h1 className="font-display text-4xl md:text-5xl text-brand-cream mb-4">
            {event.title}
          </h1>

          {event.authorName && (
            <p className="text-brand-tan text-lg mb-2">
              with <span className="text-brand-cream">{event.authorName}</span>
              {event.bookTitle && <> discussing &ldquo;{event.bookTitle}&rdquo;</>}
            </p>
          )}
        </div>
      </section>

      {/* Video — right after title */}
      {videoId && (
        <section className="pb-8 bg-brand-black">
          <div className="max-w-4xl mx-auto px-6">
            <div className="aspect-video rounded overflow-hidden burgundy-glow">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                title={event.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-12 md:py-16 bg-brand-black">
        <div className="max-w-4xl mx-auto px-6">
          {event.description && (
            <div className="mb-10">
              <p className="text-brand-tan/80 text-lg leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Book Card */}
          {event.book && (
            <div className="p-6 bg-surface rounded flex items-start gap-6">
              {event.book.coverImageUrl && (
                <Image
                  src={event.book.coverImageUrl}
                  alt={event.book.title}
                  width={80}
                  height={120}
                  className="rounded object-cover flex-shrink-0"
                />
              )}
              <div>
                <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-xs mb-2">
                  Featured Book
                </p>
                <p className="font-display text-xl text-brand-cream mb-1">
                  {event.book.title}
                </p>
                {event.book.author && (
                  <p className="text-brand-tan text-sm mb-3">
                    by {event.book.author}
                  </p>
                )}
                {event.book.description && (
                  <p className="text-brand-tan/70 text-sm mb-4 line-clamp-3">
                    {event.book.description}
                  </p>
                )}
                {event.book.purchaseUrl && (
                  <a
                    href={event.book.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-brand-burgundy-light text-sm font-medium hover:underline"
                  >
                    Get the book <Icon icon="mdi:arrow-right" className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
