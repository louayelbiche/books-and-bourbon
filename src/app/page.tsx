'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { useEffect, useRef } from 'react'

// Sample data - replace with real data
const featuredEvent = {
  title: 'The Art of Storytelling',
  author: 'James Morrison',
  book: 'Whispers in the Dark',
  date: 'February 15, 2026',
  thumbnail: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
}

const upcomingEvents = [
  {
    id: 1,
    title: 'Mystery Unraveled',
    author: 'Sarah Chen',
    date: 'Feb 22, 2026',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
  },
  {
    id: 2,
    title: 'Poetry in Motion',
    author: 'Michael Torres',
    date: 'Mar 1, 2026',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
  },
  {
    id: 3,
    title: 'Sci-Fi Frontiers',
    author: 'Elena Volkov',
    date: 'Mar 8, 2026',
    image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
  },
]

const featuredBooks = [
  {
    id: 1,
    title: 'Whispers in the Dark',
    author: 'James Morrison',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300',
    genre: 'Thriller',
  },
  {
    id: 2,
    title: 'The Last Garden',
    author: 'Sarah Chen',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300',
    genre: 'Literary Fiction',
  },
  {
    id: 3,
    title: 'Stardust Memory',
    author: 'Elena Volkov',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300',
    genre: 'Science Fiction',
  },
  {
    id: 4,
    title: 'River of Time',
    author: 'Michael Torres',
    cover: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300',
    genre: 'Poetry',
  },
]

export default function HomePage() {
  const revealRefs = useRef<HTMLElement[]>([])

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

  return (
    <>
      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920"
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
            <source src="/videos/hero.webm" type="video/webm" />
          </video>
          {/* Fallback image while video loads */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920')` }}
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
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold text-brand-cream mb-6 animate-slide-up">
            Books & <span className="text-gradient">Bourbon</span>
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Where great literature meets spirited conversation.
            Moderated discussions with acclaimed authors.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Link href="/events" className="btn-primary">
              <span className="flex items-center gap-2">
                <Icon icon="mdi:play-circle" className="w-5 h-5" />
                Watch Latest Episode
              </span>
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 border border-brand-cream/30 text-brand-cream font-medium tracking-wide hover:bg-brand-cream/10 transition-all duration-300"
            >
              Suggest a Book
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <Icon icon="mdi:chevron-down" className="w-8 h-8 text-brand-cream/50" />
        </div>
      </section>

      {/* Featured Episode Section */}
      <section className="py-24 md:py-32 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <div
            ref={addToRefs}
            className="reveal flex flex-col lg:flex-row gap-12 items-center"
          >
            {/* Video Thumbnail */}
            <div className="w-full lg:w-2/3 relative group">
              <div className="aspect-video relative overflow-hidden burgundy-glow">
                <Image
                  src={featuredEvent.thumbnail}
                  alt={featuredEvent.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-brand-black/40 flex items-center justify-center">
                  <button className="w-20 h-20 bg-brand-burgundy rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <Icon icon="mdi:play" className="w-10 h-10 text-brand-cream ml-1" />
                  </button>
                </div>
                <div className="absolute top-4 left-4 bg-brand-burgundy px-3 py-1 text-sm font-medium">
                  Latest Episode
                </div>
              </div>
            </div>

            {/* Episode Info */}
            <div className="w-full lg:w-1/3">
              <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
                Featured
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-brand-cream mb-4">
                {featuredEvent.title}
              </h2>
              <p className="text-text-secondary mb-2">
                with <span className="text-brand-cream">{featuredEvent.author}</span>
              </p>
              <p className="text-text-muted text-sm mb-6">
                Discussing &ldquo;{featuredEvent.book}&rdquo;
              </p>
              <p className="text-text-secondary flex items-center gap-2 mb-8">
                <Icon icon="mdi:calendar" className="w-5 h-5 text-brand-burgundy" />
                {featuredEvent.date}
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-brand-cream font-medium hover:text-brand-gold transition-colors group"
              >
                Watch Now
                <Icon icon="mdi:arrow-right" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
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
              <div
                key={event.id}
                ref={addToRefs}
                className={`reveal card-hover bg-surface-elevated delay-${(index + 1) * 100}`}
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 to-transparent" />
                </div>
                <div className="p-6">
                  <p className="text-text-muted text-sm flex items-center gap-2 mb-2">
                    <Icon icon="mdi:calendar" className="w-4 h-4" />
                    {event.date}
                  </p>
                  <h3 className="font-display text-xl text-brand-cream mb-2">
                    {event.title}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    with {event.author}
                  </p>
                </div>
              </div>
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

      {/* Featured Books */}
      <section className="py-24 md:py-32 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <div ref={addToRefs} className="reveal flex justify-between items-end mb-16">
            <div>
              <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
                Library
              </p>
              <h2 className="font-display text-4xl md:text-5xl text-brand-cream">
                Featured Books
              </h2>
            </div>
            <Link
              href="/books"
              className="hidden md:inline-flex items-center gap-2 text-brand-cream font-medium hover:text-brand-gold transition-colors group"
            >
              Browse All
              <Icon icon="mdi:arrow-right" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {featuredBooks.map((book, index) => (
              <div
                key={book.id}
                ref={addToRefs}
                className={`reveal card-hover group delay-${(index + 1) * 100}`}
              >
                <div className="aspect-[2/3] relative overflow-hidden mb-4 burgundy-glow">
                  <Image
                    src={book.cover}
                    alt={book.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <span className="text-brand-burgundy text-xs font-medium tracking-wider uppercase">
                  {book.genre}
                </span>
                <h3 className="font-display text-lg text-brand-cream mt-1">
                  {book.title}
                </h3>
                <p className="text-text-secondary text-sm">
                  {book.author}
                </p>
              </div>
            ))}
          </div>

          <div ref={addToRefs} className="reveal md:hidden text-center mt-8">
            <Link
              href="/books"
              className="inline-flex items-center gap-2 text-brand-cream font-medium"
            >
              Browse All Books
              <Icon icon="mdi:arrow-right" className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-burgundy opacity-90" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920')] bg-cover bg-center mix-blend-overlay opacity-20" />

        <div ref={addToRefs} className="reveal relative z-10 max-w-3xl mx-auto px-6 text-center">
          <Icon icon="mdi:lightbulb-on" className="w-12 h-12 text-brand-gold mx-auto mb-6" />
          <h2 className="font-display text-4xl md:text-5xl text-brand-cream mb-6">
            Have a Book Suggestion?
          </h2>
          <p className="text-brand-cream/80 text-lg mb-10 max-w-xl mx-auto">
            We&apos;re always looking for great books and fascinating authors to feature.
            Share your recommendations with us.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-brand-black text-brand-cream px-8 py-4 font-medium tracking-wide hover:bg-brand-black/80 transition-colors"
          >
            Submit a Suggestion
            <Icon icon="mdi:arrow-right" className="w-5 h-5" />
          </Link>
        </div>
      </section>

    </>
  )
}
