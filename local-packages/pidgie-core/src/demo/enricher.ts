/**
 * DemoEnricher: generates realistic simulated data from scraped content.
 *
 * Runs after scraping, before the agent session starts.
 * Seeded by sessionId for consistency within a session.
 */

// ─── Seeded Random ───────────────────────────────────────────────────

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

// ─── Types ───────────────────────────────────────────────────────────

export interface EnrichedProduct {
  /** Original product name from scrape. */
  name: string;
  /** Original price (unchanged). */
  price: number | null;
  /** Simulated sale price (null if no sale). */
  salePrice: number | null;
  /** Simulated stock level. */
  stock: number;
  /** Low stock flag (stock < 5). */
  lowStock: boolean;
  /** Simulated variant availability. */
  variants: { name: string; available: boolean; stock: number }[];
  /** Shipping estimate. */
  shippingEstimate: string | null;
  /** Original product data passthrough. */
  original: Record<string, unknown>;
}

export interface GeneratedSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  resource: string;
  status: 'available' | 'booked';
  popular: boolean;
}

export interface DemoEnrichment {
  products: EnrichedProduct[];
  slots: GeneratedSlot[];
  staffNames: string[];
}

// ─── Size/Color Detection ────────────────────────────────────────────

const SIZE_VARIANTS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLOR_KEYWORDS = ['red', 'blue', 'black', 'white', 'green', 'navy', 'grey', 'gray', 'pink', 'brown', 'beige'];

function inferVariants(
  productName: string,
  description: string,
  rand: () => number
): { name: string; available: boolean; stock: number }[] {
  const text = `${productName} ${description}`.toLowerCase();

  // Check if product likely has sizes (clothing, shoes)
  const hasSizes = /shirt|tee|dress|pants|jeans|jacket|coat|hoodie|sweater|top|bottom|skirt|shorts|blouse|suit/i.test(text);
  if (hasSizes) {
    return SIZE_VARIANTS.map((size) => ({
      name: size,
      available: rand() > 0.15, // 85% chance available
      stock: Math.floor(rand() * 20) + 1,
    }));
  }

  // Check for color variants
  const detectedColors = COLOR_KEYWORDS.filter((c) => text.includes(c));
  if (detectedColors.length >= 2) {
    return detectedColors.map((color) => ({
      name: color.charAt(0).toUpperCase() + color.slice(1),
      available: rand() > 0.1,
      stock: Math.floor(rand() * 15) + 1,
    }));
  }

  // No variants detected
  return [];
}

// ─── Staff Names ─────────────────────────────────────────────────────

const STAFF_FIRST_NAMES = ['Maria', 'Jean', 'Sarah', 'Ahmed', 'Lina', 'Omar', 'Sofia', 'Karim'];

function generateStaffNames(rand: () => number, count: number): string[] {
  const shuffled = [...STAFF_FIRST_NAMES].sort(() => rand() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Slot Generation ─────────────────────────────────────────────────

function generateSlots(
  businessType: string,
  hours: { open?: string; close?: string } | null,
  rand: () => number
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  const today = new Date();

  // Determine slot duration by business type
  let slotMinutes = 60;
  if (businessType === 'restaurant' || businessType === 'local') slotMinutes = 30;
  if (businessType === 'hotel') slotMinutes = 1440; // daily
  if (businessType === 'services' || businessType === 'portfolio') slotMinutes = 60;

  const openHour = hours?.open ? parseInt(hours.open.split(':')[0]) : 9;
  const closeHour = hours?.close ? parseInt(hours.close.split(':')[0]) : 18;

  // Generate 14 days
  for (let day = 1; day <= 14; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (businessType === 'hotel') {
      // Hotel: one slot per day (room availability)
      const booked = rand() < (isWeekend ? 0.7 : 0.4);
      slots.push({
        id: `slot-${slots.length}`,
        date: dateStr,
        startTime: '14:00',
        endTime: '11:00',
        resource: `Room ${Math.floor(rand() * 20) + 101}`,
        status: booked ? 'booked' : 'available',
        popular: isWeekend,
      });
      continue;
    }

    // Generate time slots for the day
    for (let hour = openHour; hour < closeHour; hour++) {
      for (let min = 0; min < 60; min += slotMinutes) {
        if (min >= 60) break;
        const startTime = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        const endMinutes = min + slotMinutes;
        const endHour = hour + Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        if (endHour > closeHour) break;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        // Occupancy: higher on weekends and evenings
        const isEvening = hour >= 17;
        let bookedChance = 0.35;
        if (isWeekend) bookedChance += 0.2;
        if (isEvening) bookedChance += 0.15;

        const booked = rand() < bookedChance;

        slots.push({
          id: `slot-${slots.length}`,
          date: dateStr,
          startTime,
          endTime,
          resource: `Slot`,
          status: booked ? 'booked' : 'available',
          popular: isWeekend && isEvening,
        });
      }
    }
  }

  return slots;
}

// ─── Main Enricher ───────────────────────────────────────────────────

export interface EnrichOptions {
  sessionId: string;
  businessType: string;
  products: { name: string; price?: number; description?: string; [key: string]: unknown }[];
  hours?: { open?: string; close?: string } | null | undefined;
  hasServices: boolean;
}

/**
 * Enrich scraped data with realistic simulated data for the demo.
 * Seeded by sessionId so the same visitor sees consistent data.
 */
export function enrichForDemo(options: EnrichOptions): DemoEnrichment {
  const rand = seededRandom(options.sessionId);

  // Enrich products
  const products: EnrichedProduct[] = options.products.map((p) => {
    const stock = Math.floor(rand() * 45) + 1; // 1-45
    const hasSale = rand() < 0.2; // 20% chance
    const saleDiscount = 0.15 + rand() * 0.15; // 15-30% off
    const price = p.price ?? null;

    return {
      name: p.name,
      price,
      salePrice: hasSale && price ? Math.round(price * (1 - saleDiscount) * 100) / 100 : null,
      stock,
      lowStock: stock < 5,
      variants: inferVariants(p.name, p.description || '', rand),
      shippingEstimate: price && price > 50 ? 'Free shipping' : 'Ships in 2-3 days',
      original: p,
    };
  });

  // Generate booking slots
  const slots = generateSlots(
    options.businessType,
    options.hours ?? null,
    rand
  );

  // Generate staff names if services detected
  const staffNames = options.hasServices
    ? generateStaffNames(rand, 3)
    : [];

  return { products, slots, staffNames };
}
