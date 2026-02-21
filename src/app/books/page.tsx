import { fetchBooks, fetchPageContent, DEFAULT_PAGE_CONTENT } from '@/lib/cms'
import BooksClient from './BooksClient'

export const revalidate = 3600

// Fallback data for when CMS is not configured
const fallbackBooks = [
  {
    id: 'fallback-1',
    title: 'Whispers in the Dark',
    slug: 'whispers-in-the-dark',
    author: 'James Morrison',
    genre: 'Thriller',
    description: 'A gripping psychological thriller that explores the depths of human nature and the secrets we keep hidden.',
    coverImageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    purchaseUrl: null,
    status: 'published' as const,
    isFeatured: true,
    sortOrder: 0,
    metadata: null,
  },
]

export default async function BooksPage() {
  const [cmsBooks, pageContent] = await Promise.all([
    fetchBooks(),
    fetchPageContent(),
  ])
  const books = cmsBooks.length > 0 ? cmsBooks : fallbackBooks
  const header = pageContent.books?.header || DEFAULT_PAGE_CONTENT.books.header

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-16 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
            {header.eyebrow}
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-brand-cream mb-6">
            {header.title}
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            {header.description}
          </p>
        </div>
      </section>

      <BooksClient books={books} />
    </>
  )
}
