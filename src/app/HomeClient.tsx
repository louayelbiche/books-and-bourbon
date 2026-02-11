'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { useEffect, useRef, useState } from 'react'
import type { CMSEvent } from '@/lib/cms'
import { VideoModal } from '@/components/VideoModal'

interface HomeClientProps {
  featuredEvent: CMSEvent
  upcomingEvents: CMSEvent[]
  pastEvents: CMSEvent[]
}

export function HomeClient({ featuredEvent, upcomingEvents, pastEvents }: HomeClientProps) {
  const revealRefs = useRef<HTMLElement[]>([])
  const [videoEvent, setVideoEvent] = useState<CMSEvent | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active')
          }
        })
      },
      { threshold: 0.1 }
    )

    revealRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('/images/hero-bg.png')` }}
          />
          {/* Dark Overlay with Burgundy Tint */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-black/60 via-brand-black/70 to-brand-black" />
          <div className="absolute inset-0 bg-brand-burgundy/20 mix-blend-multiply" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <p className="text-brand-burgundy-light font-medium tracking-[0.3em] uppercase text-sm mb-6 animate-fade-in">
            Literary Conversations
          </p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold text-brand-cream mb-6 animate-slide-up">
            Books and <span className="text-gradient">Bourbon</span>
            <span className="flex items-center justify-center gap-3 text-2xl md:text-3xl lg:text-4xl mt-4 font-normal">
              (hosted by
              <a href="https://capvstrategies.com/" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition-opacity">
                <svg viewBox="0 0 200 32" className="inline-block h-5 md:h-7 lg:h-8 w-auto" aria-label="Capital V Strategies">
                  {/* CAPITAL text */}
                  <text x="0" y="25" fill="#f5e6d4" fontFamily="'Playfair Display', Didot, Georgia, serif" fontSize="26" fontWeight="400" letterSpacing="6">CAPITAL</text>
                  {/* Stylized V mark */}
                  <g transform="translate(163, 2)">
                    <line x1="8" y1="0" x2="16" y2="27" stroke="#f5e6d4" strokeWidth="3.5" strokeLinecap="round" />
                    <line x1="24" y1="0" x2="16" y2="27" stroke="#a18320" strokeWidth="3.5" strokeLinecap="round" />
                  </g>
                </svg>
              </a>
              )
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Where great literature meets spirited conversation.
            Moderated discussions with acclaimed authors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Link href="/events" className="btn-primary">
              <span className="flex items-center gap-2">
                <Icon icon="mdi:calendar" className="w-5 h-5" />
                View Events
              </span>
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 border border-brand-cream/30 text-brand-cream font-medium tracking-wide hover:bg-brand-cream/10 transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <button
          onClick={() => document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer"
          aria-label="Scroll down"
        >
          <Icon icon="mdi:chevron-down" className="w-8 h-8 text-brand-cream/50" />
        </button>
      </section>

      {/* Featured Episode Section */}
      <section id="featured" className="py-24 md:py-32 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <div
            ref={addToRefs}
            className="reveal flex flex-col lg:flex-row gap-12 items-center"
          >
            {/* Video Thumbnail */}
            <div className="w-full lg:w-2/3 relative group">
              <button
                onClick={() => setVideoEvent(featuredEvent)}
                className="w-full text-left"
              >
                <div className="aspect-video relative overflow-hidden burgundy-glow">
                  {featuredEvent.thumbnailUrl && (
                    <Image
                      src={featuredEvent.thumbnailUrl}
                      alt={featuredEvent.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-brand-black/40 flex items-center justify-center">
                    <div className="w-20 h-20 bg-brand-burgundy rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <Icon icon="mdi:play" className="w-10 h-10 text-brand-cream ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 bg-brand-burgundy px-3 py-1 text-sm font-medium text-brand-cream">
                    Latest Episode
                  </div>
                </div>
              </button>
            </div>

            {/* Episode Info */}
            <div className="w-full lg:w-1/3">
              <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
                Featured
              </p>
              <Link href={`/events/${featuredEvent.slug}`} className="hover:text-brand-gold transition-colors">
                <h2 className="font-display text-3xl md:text-4xl text-brand-cream mb-4">
                  {featuredEvent.title}
                </h2>
              </Link>
              {featuredEvent.hostName && (
                <p className="text-brand-tan mb-2">
                  hosted by <span className="text-brand-cream">{featuredEvent.hostName}</span>
                </p>
              )}
              {featuredEvent.bookTitle && (
                <p className="text-brand-tan/70 text-sm mb-6">
                  Discussing &ldquo;{featuredEvent.bookTitle}&rdquo;{featuredEvent.authorName && <> by {featuredEvent.authorName}</>}
                </p>
              )}
              <p className="text-text-secondary flex items-center gap-2 mb-8">
                <Icon icon="mdi:calendar" className="w-5 h-5 text-brand-burgundy" />
                {formatDate(featuredEvent.eventDate)}
              </p>
              <Link
                href={`/events/${featuredEvent.slug}`}
                className="inline-flex items-center gap-2 text-brand-cream font-medium hover:text-brand-gold transition-colors group"
              >
                View Event
                <Icon icon="mdi:arrow-right" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="py-24 md:py-32 bg-surface">
          <div className="max-w-7xl mx-auto px-6">
            <div ref={addToRefs} className="reveal text-center mb-16">
              <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
                Coming Soon
              </p>
              <h2 className="font-display text-4xl md:text-5xl text-brand-cream">
                Upcoming Episodes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {upcomingEvents.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  ref={addToRefs as React.Ref<HTMLAnchorElement>}
                  className={`reveal card-hover bg-surface-elevated delay-${(index + 1) * 100}`}
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {event.thumbnailUrl ? (
                      <Image
                        src={event.thumbnailUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 to-transparent" />
                    <div className="absolute top-4 right-4 bg-brand-gold px-3 py-1 text-sm font-medium text-brand-black">
                      Coming Soon
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-brand-tan/70 text-sm flex items-center gap-2 mb-2">
                      <Icon icon="mdi:calendar" className="w-4 h-4" />
                      {formatDate(event.eventDate)}
                    </p>
                    <h3 className="font-display text-xl text-brand-cream mb-2">
                      {event.title}
                    </h3>
                    {event.hostName && (
                      <p className="text-brand-tan text-sm">
                        hosted by {event.hostName}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div ref={addToRefs} className="reveal text-center mt-12">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-brand-cream font-medium hover:text-brand-gold transition-colors group"
              >
                View All Events
                <Icon icon="mdi:arrow-right" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Past Reads */}
      {pastEvents.length > 0 && (
        <section className="py-24 md:py-32 bg-brand-black">
          <div className="max-w-7xl mx-auto px-6">
            <div ref={addToRefs} className="reveal text-center mb-16">
              <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
                Previously On
              </p>
              <h2 className="font-display text-4xl md:text-5xl text-brand-cream">
                Past Reads
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pastEvents.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  ref={addToRefs as React.Ref<HTMLAnchorElement>}
                  className={`reveal opacity-60 hover:opacity-80 transition-opacity card-hover bg-surface-elevated delay-${(index + 1) * 100}`}
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {event.thumbnailUrl ? (
                      <Image
                        src={event.thumbnailUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 to-transparent" />
                    {event.videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-brand-burgundy/80 rounded-full flex items-center justify-center">
                          <Icon icon="mdi:play" className="w-6 h-6 text-brand-cream ml-0.5" />
                        </div>
                      </div>
                    )}
                    {event.duration && (
                      <div className="absolute bottom-3 right-3 bg-brand-black/80 px-2 py-1 text-xs text-brand-cream">
                        {event.duration}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-brand-tan/70 text-sm flex items-center gap-2 mb-2">
                      <Icon icon="mdi:calendar" className="w-4 h-4" />
                      {formatDate(event.eventDate)}
                    </p>
                    <h3 className="font-display text-xl text-brand-cream mb-2">
                      {event.title}
                    </h3>
                    {event.hostName && (
                      <p className="text-brand-tan text-sm mb-1">
                        hosted by {event.hostName}
                      </p>
                    )}
                    {event.bookTitle && (
                      <p className="text-brand-tan/50 text-xs">
                        &ldquo;{event.bookTitle}&rdquo;{event.authorName && <> by {event.authorName}</>}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div ref={addToRefs} className="reveal text-center mt-12">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-brand-cream font-medium hover:text-brand-gold transition-colors group"
              >
                View All Events
                <Icon icon="mdi:arrow-right" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Suggest a Book */}
      <section className="py-24 md:py-32 bg-surface">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div ref={addToRefs} className="reveal">
            <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
              Your Turn
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-brand-cream mb-6">
              Got a Book We Should Read?
            </h2>
            <p className="text-text-secondary text-lg mb-10 max-w-xl mx-auto">
              The best conversations start with great recommendations.
              Tell us what book deserves a seat at the table.
            </p>
            <Link
              href="/contact"
              className="btn-primary inline-flex items-center gap-2"
            >
              <span className="flex items-center gap-2">
                <Icon icon="mdi:book-plus" className="w-5 h-5" />
                Suggest a Book
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {videoEvent && (
        <VideoModal event={videoEvent} onClose={() => setVideoEvent(null)} />
      )}
    </>
  )
}
