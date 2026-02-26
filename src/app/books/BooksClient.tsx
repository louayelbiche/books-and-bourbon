'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import type { CMSBook } from '@/lib/cms'

interface BooksClientProps {
  books: CMSBook[];
}

export default function BooksClient({ books }: BooksClientProps) {
  const [selectedBook, setSelectedBook] = useState<CMSBook | null>(null)

  return (
    <>
      {/* Books Grid */}
      <section className="py-16 md:py-24 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          {books.length === 0 ? (
            <p className="text-text-secondary text-center text-lg">
              No books available yet. Check back soon!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedBook(book)}
                >
                  <div className="aspect-[2/3] relative overflow-hidden mb-4 card-hover">
                    {book.coverImageUrl ? (
                      <Image
                        src={book.coverImageUrl}
                        alt={book.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center">
                        <Icon icon="mdi:book-open-variant" className="w-12 h-12 text-text-secondary" />
                      </div>
                    )}
                    {book.isFeatured && (
                      <div className="absolute top-3 left-3 bg-brand-gold px-2 py-1 text-xs font-mono font-medium text-brand-black">
                        Featured
                      </div>
                    )}
                    <div className="absolute inset-0 bg-brand-black/0 group-hover:bg-brand-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-brand-cream font-medium">View Details</span>
                    </div>
                  </div>
                  {book.genre && (
                    <span className="font-mono text-brand-burgundy text-xs font-medium tracking-[0.15em] uppercase">
                      {book.genre}
                    </span>
                  )}
                  <h3 className="font-display text-lg text-brand-cream mt-1 group-hover:text-brand-gold transition-colors">
                    {book.title}
                  </h3>
                  {book.author && (
                    <p className="text-brand-tan text-sm">
                      {book.author}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 z-50 bg-brand-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface p-4 sm:p-8 md:p-12 relative"
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
                  {selectedBook.coverImageUrl ? (
                    <Image
                      src={selectedBook.coverImageUrl}
                      alt={selectedBook.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface flex items-center justify-center">
                      <Icon icon="mdi:book-open-variant" className="w-16 h-16 text-text-secondary" />
                    </div>
                  )}
                </div>
              </div>

              {/* Book Info */}
              <div className="flex-1">
                {selectedBook.genre && (
                  <span className="font-mono text-brand-burgundy text-sm font-medium tracking-[0.15em] uppercase">
                    {selectedBook.genre}
                  </span>
                )}
                <h2 className="font-display text-3xl md:text-4xl text-brand-cream mt-2 mb-2">
                  {selectedBook.title}
                </h2>
                {selectedBook.author && (
                  <p className="text-brand-tan text-lg mb-6">
                    by {selectedBook.author}
                  </p>
                )}

                {selectedBook.description && (
                  <p className="text-brand-tan/80 leading-relaxed mb-8">
                    {selectedBook.description}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  {selectedBook.purchaseUrl && (
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
                  )}
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
