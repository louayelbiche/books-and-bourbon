/**
 * Seed B&B events + books into BIB CMS database.
 * Run from runwell-bib/apps/web: node ../../books-and-bourbon/scripts/seed-events.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = 'dfc9d01b-2564-49f0-9b06-d5cbe2f729f5'; // CapitalV

const books = [
  {
    title: 'Unreasonable Hospitality',
    slug: 'unreasonable-hospitality',
    author: 'Will Guidara',
    genre: 'Business',
    description: 'The remarkable power of giving people more than they expect — how the former co-owner of Eleven Madison Park turned a restaurant into the best in the world through obsessive, creative hospitality.',
    coverImageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200',
    status: 'published',
    isFeatured: true,
    sortOrder: 1,
  },
  {
    title: 'Same as Ever',
    slug: 'same-as-ever',
    author: 'Morgan Housel',
    genre: 'Psychology / Business',
    description: 'A guide to what never changes in a world obsessed with what does. Morgan Housel explores the timeless behaviors that drive risk, opportunity, and every decision we make.',
    coverImageUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200',
    status: 'published',
    isFeatured: false,
    sortOrder: 2,
  },
  {
    title: 'Shoe Dog',
    slug: 'shoe-dog',
    author: 'Phil Knight',
    genre: 'Memoir / Business',
    description: 'The candid, riveting memoir of the founder of Nike. A story of bootstrapping, near-bankruptcy, and the grit required to build one of the most iconic brands on earth.',
    coverImageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200',
    status: 'published',
    isFeatured: false,
    sortOrder: 3,
  },
  {
    title: 'Never Split the Difference',
    slug: 'never-split-the-difference',
    author: 'Chris Voss',
    genre: 'Negotiation / Psychology',
    description: 'A former FBI hostage negotiator reveals the techniques that work in any negotiation — from boardrooms to billion-dollar deals.',
    coverImageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=200',
    status: 'published',
    isFeatured: false,
    sortOrder: 4,
  },
  {
    title: 'The Hard Thing About Hard Things',
    slug: 'the-hard-thing-about-hard-things',
    author: 'Ben Horowitz',
    genre: 'Business / Venture Capital',
    description: 'Ben Horowitz, co-founder of Andreessen Horowitz, offers essential advice on building and running a startup — the hard stuff nobody talks about.',
    coverImageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=200',
    status: 'published',
    isFeatured: false,
    sortOrder: 5,
  },
];

const events = [
  {
    title: 'The Art of Radical Generosity',
    slug: 'the-art-of-radical-generosity',
    bookSlug: 'unreasonable-hospitality',
    authorName: 'Will Guidara',
    bookTitle: 'Unreasonable Hospitality',
    eventDate: new Date('2026-02-22'),
    startTime: '19:00',
    endTime: '20:30',
    duration: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800',
    videoUrl: null,
    status: 'scheduled',
    isFeatured: true,
    description: 'Will Guidara joins us to explore the philosophy behind world-class service — and why the most successful leaders, from restaurateurs to CEOs, build empires on the radical idea of giving more than expected. A conversation about client obsession, referral-driven growth, and why hospitality is the ultimate brand strategy.',
  },
  {
    title: 'What Never Changes',
    slug: 'what-never-changes',
    bookSlug: 'same-as-ever',
    authorName: 'Morgan Housel',
    bookTitle: 'Same as Ever',
    eventDate: new Date('2026-03-08'),
    startTime: '19:00',
    endTime: '20:30',
    duration: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
    videoUrl: null,
    status: 'scheduled',
    isFeatured: false,
    description: 'In an era where AI is reshaping every industry overnight, Morgan Housel makes the contrarian case: the most powerful insights come from what stays the same. We explore timeless patterns in human behavior — greed, fear, storytelling, risk — and why understanding them matters more than chasing the next trend.',
  },
  {
    title: 'Building an Empire from Nothing',
    slug: 'building-an-empire-from-nothing',
    bookSlug: 'shoe-dog',
    authorName: 'Phil Knight',
    bookTitle: 'Shoe Dog',
    eventDate: new Date('2026-01-25'),
    startTime: '19:00',
    endTime: '20:15',
    duration: '1:12:40',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=800',
    videoUrl: 'https://www.youtube.com/watch?v=atljnarLMh4',
    status: 'recorded',
    isFeatured: false,
    description: "We revisited Phil Knight's raw, unvarnished account of building Nike from a $50 loan and a handshake deal with a Japanese shoe company. The conversation turned to what every founder knows but rarely says aloud — the loneliness, the cash crunches, and the moments where quitting felt like the rational choice.",
  },
  {
    title: 'Tactical Empathy in High-Stakes Rooms',
    slug: 'tactical-empathy-in-high-stakes-rooms',
    bookSlug: 'never-split-the-difference',
    authorName: 'Chris Voss',
    bookTitle: 'Never Split the Difference',
    eventDate: new Date('2026-01-11'),
    startTime: '19:00',
    endTime: '20:20',
    duration: '58:15',
    thumbnailUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    status: 'recorded',
    isFeatured: false,
    description: 'Chris Voss walked us through the negotiation frameworks he used to save lives — and how they translate to crisis communications, investor conversations, and closing deals. We explored tactical empathy, calibrated questions, and why the most powerful word in any negotiation is "no."',
  },
  {
    title: 'When Things Fall Apart',
    slug: 'when-things-fall-apart',
    bookSlug: 'the-hard-thing-about-hard-things',
    authorName: 'Ben Horowitz',
    bookTitle: 'The Hard Thing About Hard Things',
    eventDate: new Date('2025-12-28'),
    startTime: '19:00',
    endTime: '20:30',
    duration: '1:05:22',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    videoUrl: 'https://www.youtube.com/watch?v=atljnarLMh4',
    status: 'recorded',
    isFeatured: false,
    description: "We dove into Ben Horowitz's unflinching account of the decisions that nearly destroyed his company — and the ones that saved it. From firing friends to managing your own psychology as a CEO, this conversation resonated deeply with anyone who has ever scaled a company and wondered if they were going to make it.",
  },
];

async function seed() {
  console.log('Seeding B&B books + events for CapitalV tenant...\n');

  // Clear existing B&B events and books for this tenant
  const deletedEvents = await prisma.event.deleteMany({ where: { tenantId: TENANT_ID } });
  const deletedBooks = await prisma.book.deleteMany({ where: { tenantId: TENANT_ID } });
  console.log(`Cleared ${deletedEvents.count} existing events, ${deletedBooks.count} existing books\n`);

  // Create books
  const bookMap = {};
  for (const book of books) {
    const created = await prisma.book.create({
      data: { tenantId: TENANT_ID, ...book },
    });
    bookMap[book.slug] = created.id;
    console.log(`  Book: "${created.title}" (${created.id})`);
  }

  console.log('');

  // Create events linked to books
  for (const { bookSlug, ...eventData } of events) {
    const created = await prisma.event.create({
      data: {
        tenantId: TENANT_ID,
        ...eventData,
        bookId: bookMap[bookSlug],
        publishedAt: eventData.status === 'scheduled' ? new Date() : null,
      },
    });
    console.log(`  Event: "${created.title}" → book:${bookSlug} (${created.status})`);
  }

  console.log('\nDone! 5 books + 5 events seeded.');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
