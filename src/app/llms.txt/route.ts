import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const content = `# Books & Bourbon
> A curated space for book lovers and bourbon enthusiasts — literary events, tastings, and community

## About
Books & Bourbon is a unique venue combining literary culture with bourbon appreciation.
We host book clubs, author readings, bourbon tastings, and community events.
Our curated collection features fiction, non-fiction, and rare editions alongside
a selection of premium bourbons and craft cocktails.

## Books
- Curated Collection: Hand-picked fiction, non-fiction, poetry, and rare editions
- Book Clubs: Monthly themed reading groups with discussion events
- Author Events: Readings, signings, and Q&A sessions with authors
- Recommendations: Personalized book suggestions from our team

## Bourbon & Drinks
- Bourbon Selection: Premium and rare bourbon collection
- Craft Cocktails: Bourbon-based cocktails and seasonal specials
- Tasting Events: Guided bourbon tastings with expert commentary
- Non-Alcoholic: Coffee, tea, and mocktails available

## Events
- Book Club Nights: Monthly themed reading discussions
- Bourbon Tastings: Guided tastings featuring new and rare selections
- Author Readings: Live readings and book signings
- Open Mic: Poetry and storytelling evenings
- Private Events: Venue available for private gatherings

## Key Pages
- [Home](https://books.runwellsystems.com/): Welcome and upcoming events
- [Books](https://books.runwellsystems.com/books): Book collection and recommendations
- [Events](https://books.runwellsystems.com/events): Event calendar and tickets
- [About](https://books.runwellsystems.com/about): Our story and mission
- [FAQ](https://books.runwellsystems.com/faq): Frequently asked questions
- [Contact](https://books.runwellsystems.com/contact): Location, hours, and inquiries

## Contact
- Website: https://books.runwellsystems.com
- Email: hello@booksandbourbon.com

## Languages
- English (primary), French
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
