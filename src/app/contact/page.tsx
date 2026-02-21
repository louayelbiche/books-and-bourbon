import { fetchPageContent, DEFAULT_PAGE_CONTENT } from '@/lib/cms'
import { ContactClient } from './ContactClient'

export const revalidate = 3600

export default async function ContactPage() {
  const pageContent = await fetchPageContent()
  const contactContent = pageContent.contact || DEFAULT_PAGE_CONTENT.contact

  return <ContactClient contactContent={contactContent} />
}
