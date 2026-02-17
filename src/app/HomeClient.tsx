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
                <svg viewBox="145 303 708 100" className="inline-block h-5 md:h-7 lg:h-8 w-auto" aria-label="Capital V Strategies">
                  <path d="M203.76,371.29L203.09,372.11C196.93,379.21 189.97,383.12 183.11,383.64L183.11,383.64C180.70,383.68 178.31,383.28 175.97,382.44C165.53,378.66 158.51,366.61 158.51,352.46C158.51,338.30 165.53,326.26 175.97,322.47C178.31,321.63 180.70,321.24 183.11,321.27L183.11,321.27C189.97,321.79 196.93,325.70 203.09,332.80L203.76,333.62L204.44,334.41L206.54,332.00C204.80,329.25 198.68,321.65 186.08,319.91C185.68,319.84 185.28,319.77 184.86,319.71C184.71,319.70 184.59,319.66 184.43,319.64C184.43,319.64 181.22,319.23 179.39,319.35C161.54,319.53 149.11,333.08 149.11,352.46C149.11,371.83 161.54,385.39 179.39,385.56C181.22,385.68 184.43,385.27 184.43,385.27C184.59,385.26 184.71,385.22 184.86,385.20C185.28,385.14 185.68,385.08 186.08,385.01C198.68,383.26 204.80,375.67 206.54,372.91L204.44,370.50L203.76,371.29Z" fill="#f5e6d4"/>
                  <path d="M240.97,385.57L243.23,385.57L265.63,331.82L265.67,331.91L265.71,331.82L277.13,359.17L260.30,359.17L258.96,362.37L278.58,362.63L282.28,371.49L282.21,371.49L282.92,373.04L283.04,373.04L288.66,385.57L297.43,385.57L268.86,319.34L240.97,385.57Z" fill="#f5e6d4"/>
                  <path d="M370.02,321.57C363.81,319.33 356.17,319.34 351.09,319.34L341.76,319.34L341.76,385.57L349.73,385.57L349.73,356.30L349.73,351.73L349.73,323.55L349.73,320.60L357.63,320.60C362.80,320.60 371.66,323.99 372.06,336.71C372.22,341.68 371.04,345.49 368.56,348.04C364.98,351.73 359.64,351.73 357.63,351.73L354.19,351.73L354.19,356.31C361.49,356.32 371.40,353.05 376.83,347.68C379.48,345.05 380.83,341.37 380.83,336.74C380.83,329.15 377.29,324.18 370.02,321.57Z" fill="#f5e6d4"/>
                  <path d="M430.90,319.34L437.97,319.34L437.97,385.57L430.90,385.57Z" fill="#f5e6d4"/>
                  <path d="M483.94,321.32L505.66,321.32L505.66,385.57L513.63,385.57L513.63,321.32L535.26,321.32L535.26,319.34L483.94,319.34L483.94,321.32Z" fill="#f5e6d4"/>
                  <path d="M574.58,385.57L576.84,385.57L599.24,331.82L599.28,331.91L599.32,331.82L610.74,359.17L591.72,359.17L590.38,362.37L612.20,362.66L615.89,371.49L615.82,371.49L616.53,373.04L616.65,373.04L622.28,385.57L631.04,385.57L602.47,319.34L574.58,385.57Z" fill="#f5e6d4"/>
                  <path d="M682.82,383.46L682.82,319.34L675.74,319.34L675.74,383.46L675.74,384.52L675.74,385.57L715.89,385.57L715.89,383.46L682.82,383.46Z" fill="#f5e6d4"/>
                  <path d="M808.32,397.74L773.57,316.22L756.82,307.08L791.30,387.97C791.30,387.97 795.77,398.96 808.32,397.74Z" fill="#f5e6d4"/>
                  <path d="M813.46,357.39L831.79,316.22L848.64,307.08L828.92,351.16C828.92,351.16 827.09,357.39 820.28,357.39L813.46,357.39Z" fill="#a18320"/>
                </svg>
              </a>
              )
            </span>
          </h1>
          <span className="accent-line mt-6 mb-8 animate-slide-up" style={{ animationDelay: '0.15s' }} />
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up tracking-wide" style={{ animationDelay: '0.2s' }}>
            An author-led series featuring moderated conversations
            on literature, ideas, and craft.
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
              <br />
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
