import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { BBChat } from '@/components/chat/BBChat'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Books and Bourbon | Literary Conversations',
  description: 'An author-led series featuring moderated conversations on literature, ideas, and craft. Watch recorded conversations, discover books, and join our literary community.',
  keywords: 'books, bourbon, author talks, literary events, book discussions, author interviews',
  openGraph: {
    title: 'Books and Bourbon | Literary Conversations',
    description: 'Where great books meet great conversations',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-brand-black text-brand-cream min-h-screen">
        <Navigation />
        <main>{children}</main>
        <BBChat />
        <Footer />
      </body>
    </html>
  )
}
