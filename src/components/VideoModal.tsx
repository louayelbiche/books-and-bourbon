'use client'

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

interface VideoModalProps {
  event: CMSEvent
  onClose: () => void
}

export function VideoModal({ event, onClose }: VideoModalProps) {
  const videoId = event.videoUrl ? extractYouTubeId(event.videoUrl) : null

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title + Close */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display text-2xl text-brand-cream">
              {event.title}
            </h3>
            {event.authorName && (
              <p className="text-text-secondary">
                with {event.authorName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-brand-cream transition-colors"
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* YouTube Embed */}
        {videoId ? (
          <div className="aspect-video bg-brand-black rounded overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={event.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="aspect-video bg-surface flex items-center justify-center rounded">
            <p className="text-text-secondary">Video not available</p>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="mt-4 p-4 bg-surface rounded">
            <p className="text-text-secondary">
              {event.description}
            </p>
          </div>
        )}

        {/* Book Info */}
        {event.book && (
          <div className="mt-4 p-4 bg-surface rounded flex items-center gap-4">
            {event.book.coverImageUrl && (
              <Image
                src={event.book.coverImageUrl}
                alt={event.book.title}
                width={48}
                height={72}
                className="rounded object-cover"
              />
            )}
            <div>
              <p className="text-brand-cream font-medium">{event.book.title}</p>
              {event.book.author && (
                <p className="text-text-secondary text-sm">by {event.book.author}</p>
              )}
              {event.book.purchaseUrl && (
                <a
                  href={event.book.purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-burgundy-light text-sm hover:underline mt-1 inline-block"
                >
                  Get the book &rarr;
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
