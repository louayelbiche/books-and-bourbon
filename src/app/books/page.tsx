'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { useState } from 'react'

// Sample data - replace with real data
const books = [
  {
    id: 1,
    title: 'Whispers in the Dark',
    author: 'James Morrison',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    genre: 'Thriller',
    description: 'A gripping psychological thriller that explores the depths of human nature and the secrets we keep hidden.',
    featured: true,
    purchaseUrl: '#',
  },
  {
    id: 2,
    title: 'The Last Garden',
    author: 'Sarah Chen',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
    genre: 'Literary Fiction',
    description: 'A beautifully crafted novel about family, loss, and the gardens we cultivate in our lives.',
    featured: true,
    purchaseUrl: '#',
  },
  {
    id: 3,
    title: 'Stardust Memory',
    author: 'Elena Volkov',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    genre: 'Science Fiction',
    description: 'An epic space opera that spans galaxies and generations, exploring what it means to be human.',
    featured: true,
    purchaseUrl: '#',
  },
  {
    id: 4,
    title: 'River of Time',
    author: 'Michael Torres',
    cover: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400',
    genre: 'Poetry',
    description: 'A collection of contemporary poetry that captures the rhythms of modern life with timeless elegance.',
    featured: false,
    purchaseUrl: '#',
  },
  {
    id: 5,
    title: 'Echoes of Empire',
    author: 'Robert Williams',
    cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400',
    genre: 'Historical Fiction',
    description: 'A sweeping historical novel set in the twilight years of the British Empire.',
    featured: false,
    purchaseUrl: '#',
  },
  {
    id: 6,
    title: 'Midnight Sonata',
    author: 'Clara Bennett',
    cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    genre: 'Romance',
    description: 'A passionate love story set against the backdrop of the classical music world.',
    featured: false,
    purchaseUrl: '#',
  },
  {
    id: 7,
    title: 'The Cipher',
    author: 'David Park',
    cover: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400',
    genre: 'Mystery',
    description: 'A code-breaking mystery that will keep you guessing until the very last page.',
    featured: false,
    purchaseUrl: '#',
  },
  {
    id: 8,
    title: 'Wild Hearts',
    author: 'Anna Rodriguez',
    cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
    genre: 'Adventure',
    description: 'An exhilarating adventure across the American wilderness in search of redemption.',
    featured: false,
    purchaseUrl: '#',
  },
]

export default function BooksPage() {
  const [selectedBook, setSelectedBook] = useState<typeof books[0] | null>(null)

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-16 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
            Our Library
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-brand-cream mb-6">
            Featured Books
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Discover the books discussed in our sessions. Each title has been carefully selected for its literary merit and conversation-worthy themes.
          </p>
        </div>
      </section>

      {/* Books Grid */}
      <section className="py-16 md:py-24 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {books.map((book) => (
              <div
                key={book.id}
                className="group cursor-pointer"
                onClick={() => setSelectedBook(book)}
              >
                <div className="aspect-[2/3] relative overflow-hidden mb-4 card-hover">
                  <Image
                    src={book.cover}
                    alt={book.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {book.featured && (
                    <div className="absolute top-3 left-3 bg-brand-gold px-2 py-1 text-xs font-medium text-brand-black">
                      Featured
                    </div>
                  )}
                  <div className="absolute inset-0 bg-brand-black/0 group-hover:bg-brand-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="text-brand-cream font-medium">View Details</span>
                  </div>
                </div>
                <span className="text-brand-burgundy text-xs font-medium tracking-wider uppercase">
                  {book.genre}
                </span>
                <h3 className="font-display text-lg text-brand-cream mt-1 group-hover:text-brand-gold transition-colors">
                  {book.title}
                </h3>
                <p className="text-text-secondary text-sm">
                  {book.author}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 bg-brand-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="w-full max-w-3xl bg-surface p-8 md:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-brand-cream transition-colors"
            >
              <Icon icon="mdi:close" className="w-6 h-6" />
            </button>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Book Cover */}
              <div className="w-full md:w-1/3 flex-shrink-0">
                <div className="aspect-[2/3] relative burgundy-glow">
                  <Image
                    src={selectedBook.cover}
                    alt={selectedBook.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Book Info */}
              <div className="flex-1">
                <span className="text-brand-burgundy text-sm font-medium tracking-wider uppercase">
                  {selectedBook.genre}
                </span>
                <h2 className="font-display text-3xl md:text-4xl text-brand-cream mt-2 mb-2">
                  {selectedBook.title}
                </h2>
                <p className="text-text-secondary text-lg mb-6">
                  by {selectedBook.author}
                </p>

                <p className="text-text-secondary leading-relaxed mb-8">
                  {selectedBook.description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href={selectedBook.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <span className="flex items-center gap-2">
                      <Icon icon="mdi:cart" className="w-5 h-5" />
                      Purchase Book
                    </span>
                  </a>
                  <Link
                    href="/events"
                    className="px-6 py-3 border border-brand-cream/30 text-brand-cream font-medium text-center hover:bg-brand-cream/10 transition-colors"
                  >
                    Watch Episode
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
