import type { Metadata } from 'next'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Books and Bourbon | Literary Conversations',
  description: 'Moderated speaking sessions between acclaimed authors and passionate hosts. Watch recorded conversations, discover books, and join our literary community.',
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
        <Footer />
      </body>
    </html>
  )
}
