import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { BBChat } from '@/components/chat/BBChat'
import { fetchSiteImages } from '@/lib/cms'

const BASE_URL = 'https://books.runwellsystems.com'
const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=630&fit=crop&q=80'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export async function generateMetadata(): Promise<Metadata> {
  const siteImages = await fetchSiteImages();
  const ogImage = siteImages.ogImage || DEFAULT_OG_IMAGE;

  return {
    metadataBase: new URL(BASE_URL),
    title: 'Books and Bourbon | Literary Conversations',
    description: 'An author-led series featuring moderated conversations on literature, ideas, and craft. Watch recorded conversations, discover books, and join our literary community.',
    keywords: 'books, bourbon, author talks, literary events, book discussions, author interviews',
    openGraph: {
      title: 'Books and Bourbon | Literary Conversations',
      description: 'Where great books meet great conversations',
      type: 'website',
      url: BASE_URL,
      siteName: 'Books and Bourbon',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Books and Bourbon — Literary Conversations' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Books and Bourbon | Literary Conversations',
      description: 'Where great books meet great conversations',
      images: [ogImage],
    },
  };
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Books and Bourbon',
  description: 'An author-led series featuring moderated conversations on literature, ideas, and craft.',
  url: BASE_URL,
  logo: `${BASE_URL}/icon.svg`,
  sameAs: [
    'https://www.instagram.com/capvstrategies/',
    'https://www.linkedin.com/company/capitalvstrategies',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-brand-black text-brand-cream min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navigation />
        <main>{children}</main>
        <BBChat />
        <Footer />
      </body>
    </html>
  )
}
