import { fetchFAQs, CMSFAQ } from '@/lib/cms'
import { FAQClient } from './FAQClient'

export const revalidate = 3600

const fallbackFAQs: CMSFAQ[] = [
  {
    id: 'f1',
    question: 'What is Books and Bourbon?',
    answer: 'Books and Bourbon is a literary community where great books meet spirited conversation. We host moderated discussions with acclaimed authors, offering members intimate access to the stories behind the stories.',
    category: 'General',
    sortOrder: 0,
  },
  {
    id: 'f2',
    question: 'How do I attend an event?',
    answer: 'Our events are listed on the Events page. Browse upcoming discussions, click on the one that interests you, and follow the registration instructions. Some events are virtual, while others are held at our New York location.',
    category: 'Events',
    sortOrder: 1,
  },
  {
    id: 'f3',
    question: 'Can I suggest a book or author?',
    answer: 'Absolutely! We welcome book and author suggestions from our community. Visit our Contact page and select "Book Suggestion" or "Author Recommendation" from the inquiry type. Our team reviews every submission.',
    category: 'General',
    sortOrder: 2,
  },
  {
    id: 'f4',
    question: 'Are events recorded?',
    answer: 'Yes, most of our live discussions are recorded and made available on our Events page. Look for events marked as "Recorded" to watch past conversations at your convenience.',
    category: 'Events',
    sortOrder: 3,
  },
  {
    id: 'f5',
    question: 'How can I partner with Books and Bourbon?',
    answer: 'We are always open to partnership opportunities with publishers, authors, literary organizations, and brands that align with our mission. Reach out through our Contact page with "Partnership Inquiry" as the type, and our team will get back to you within 48 hours.',
    category: 'Partnerships',
    sortOrder: 4,
  },
  {
    id: 'f6',
    question: 'Is there a cost to join?',
    answer: 'Books and Bourbon events and content are currently free to access. We believe in making literary conversations accessible to everyone. Some special events may have registration requirements.',
    category: 'General',
    sortOrder: 5,
  },
]

export default async function FAQPage() {
  const cmsFAQs = await fetchFAQs()
  const faqs: CMSFAQ[] = cmsFAQs.length > 0 ? cmsFAQs : fallbackFAQs

  return <FAQClient faqs={faqs} />
}
