/**
 * SystemPromptBuilder: Auto-inject voice, data integrity, DataContext
 *
 * Assembles the final system prompt from 6 sections:
 * 1. Domain prompt (from agent's buildDomainSystemPrompt)
 * 2. DataContext summary (serialized)
 * 3. Voice rules
 * 4. Data integrity rules
 * 5. Available/missing field summary from _meta
 * 6. Mode-specific rules
 *
 * @see spec TASK-017, TASK-018
 */

import type { DataContext } from '../context/types.js';

// =============================================================================
// Constants
// =============================================================================

const VOICE_RULES = `## Voice Rules
Always speak in first person as a representative of the business. You ARE the business, not an AI assistant talking about the business. Say 'we offer' not 'the business offers'. Never refer to yourself as 'the AI', 'the bot', 'the system', or 'the assistant'.`;

const DATA_INTEGRITY_RULES = `## Data Integrity Rules
IMPORTANT: If data is marked as 'Not available' or 'Not configured', you MUST say it's 'not available yet' or 'not set up yet'. NEVER fabricate business-specific data: phone numbers, addresses, prices, product names, service names, hours, or promotions. These MUST come from the data provided above.

However, you MAY use your general knowledge to:
- Explain industry concepts (e.g., what hematology parameters are, how centrifuges work, what soil pH means)
- Interpret customer queries using domain expertise (e.g., "binoculaire" is a type of microscope; "5 parties" refers to a 5-part differential hematology analyzer)
- Suggest related products from the catalog when an exact match is not found

When a customer asks for a product you do NOT have in your catalog:
- Clearly state you do not currently carry that specific item
- Suggest the closest related products you DO have
- Offer to connect the customer with the team for sourcing or alternatives

## Conversation Flow for Actions
You have tools that create real records in the business system. Follow this flow for EVERY action:

**Step 1: Detect intent.** As you chat, classify what the visitor wants:
- HELP: They want to talk to a human, file a complaint, or ask something you cannot answer from your data
- INTEREST: They show buying intent, ask for a quote, want to be contacted, or provide their contact info for follow-up
- ORDER: They want to reserve or purchase specific products with quantities
- BOOKING: They want to schedule an appointment or reserve a time slot

**Step 2: Clarify if needed.** If intent is ambiguous, ask one focused question:
- "Would you like me to have our team contact you about this?"
- "Shall I reserve those items for you?"
- "Would you like me to check available slots?"

**Step 3: Confirm before executing.** Always confirm before calling a tool:
- "I'll submit your request to our team so they can follow up. Shall I proceed?"
- "I'll record your interest and have someone reach out to you. OK?"
- "I'll reserve 500 Chemlali plants under your name. Confirm?"

**Step 4: Call the tool.** When the visitor confirms (yes, OK, oui, d'accord, confirme, proceed), you MUST include the tool call in your response. This means your response contains BOTH text AND a function call. Do not respond with only text.
- HELP: Call **submit_request** with their question and contact info
- INTEREST: Call **capture_lead** with their interest and contact info
- ORDER: Call **place_order** with customer name, items, and quantities
- BOOKING: Call **create_booking** with the confirmed slot

**CRITICAL RULES:**
- When you say "I will submit" or "I am submitting" or "I have noted", the function call MUST be part of that same response. Saying you will do something without calling the function is a broken promise; the record won't be created and no one will follow up.
- If the visitor says yes/confirm/oui/d'accord in response to your confirmation question, call the tool immediately in your response. Never ask for a second confirmation.
- If you detect HELP intent but can partially answer, answer what you can AND ALSO ask if they want you to submit for human follow-up.
- If the visitor provides contact info (email, phone) alongside buying intent, that is implicit confirmation. Call capture_lead immediately.
- For submit_request: the "question" parameter should summarize what the visitor needs help with, not repeat the entire conversation.`;

const DASHBOARD_MODE_RULES = `## Mode: Dashboard
You have access to card and panel tools for rich UI responses.`;

const PUBLIC_MODE_RULES = `## Mode: Public
You are in public-facing mode. Be helpful but concise. Do not reveal internal system details. Only provide information from your configured data.`;

const WRITING_RULES = `## Writing Rules
Never use em dashes or en dashes in any response. Rewrite: period for separate thoughts, semicolon for related clauses, colon for explanations, comma for light pauses.`;

// =============================================================================
// Day names for hours formatting
// =============================================================================

const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

// =============================================================================
// buildBibSystemPrompt
// =============================================================================

/**
 * Assemble the final system prompt from all sections.
 *
 * @param domainPrompt - Domain-specific prompt from the agent
 * @param dataContext - The loaded DataContext
 * @param mode - Operating mode (dashboard or public)
 * @returns Complete system prompt string
 */
export function buildBibSystemPrompt(
  domainPrompt: string,
  dataContext: DataContext,
  mode: 'dashboard' | 'public'
): string {
  const sections: string[] = [];

  // 1. Domain prompt
  sections.push(domainPrompt);

  // 2. DataContext summary
  sections.push(serializeDataContext(dataContext));

  // 3. Voice rules
  sections.push(VOICE_RULES);

  // 4. Data integrity rules
  sections.push(DATA_INTEGRITY_RULES);

  // 5. Available/missing field summary from _meta
  sections.push(buildFieldSummary(dataContext));

  // 6. Mode-specific rules
  sections.push(mode === 'dashboard' ? DASHBOARD_MODE_RULES : PUBLIC_MODE_RULES);

  // 7. Writing rules
  sections.push(WRITING_RULES);

  return sections.join('\n\n');
}

// =============================================================================
// serializeDataContext
// =============================================================================

/**
 * Convert DataContext to human-readable text for LLM consumption.
 *
 * Truncates large collections:
 * - services/products > 20 items show first 20 + "and N more..."
 * - FAQs > 10 items show first 10 + "and N more..."
 *
 * @param ctx - The DataContext to serialize
 * @returns Human-readable text representation
 */
export function serializeDataContext(ctx: DataContext): string {
  const sections: string[] = [];

  // Business
  sections.push(
    `## Business: ${ctx.business.name} (${ctx.business.category})`,
    `Description: ${ctx.business.description || 'Not available'}`,
    `Industry: ${ctx.business.industry || 'Not available'}`
  );

  // Contact
  sections.push('');
  sections.push('## Contact');
  sections.push(`Phone: ${ctx.contact.phone || 'Not available'}`);
  sections.push(`Email: ${ctx.contact.email || 'Not available'}`);
  sections.push(`Address: ${formatAddress(ctx.contact.address)}`);
  sections.push(`Social Media: ${formatSocialMedia(ctx.contact.socialMedia)}`);

  // Hours
  sections.push('');
  sections.push('## Hours');
  sections.push(formatHours(ctx.hours));

  // Services
  sections.push('');
  const serviceCount = ctx.services.length;
  sections.push(`## Services (${serviceCount})`);
  if (serviceCount === 0) {
    sections.push('None configured');
  } else {
    const limit = 20;
    const displayed = ctx.services.slice(0, limit);
    for (const s of displayed) {
      const price = s.priceInCents > 0 ? ` - $${(s.priceInCents / 100).toFixed(2)}` : '';
      const duration = s.durationMinutes > 0 ? ` (${s.durationMinutes} min)` : '';
      sections.push(`- ${s.name}${duration}${price}`);
    }
    if (serviceCount > limit) {
      sections.push(`and ${serviceCount - limit} more...`);
    }
  }

  // Products (grouped by category for better LLM comprehension)
  sections.push('');
  const productCount = ctx.products.length;
  sections.push(`## Products (${productCount})`);
  if (productCount === 0) {
    sections.push('None configured');
  } else {
    // Group by category
    const byCategory = new Map<string, typeof ctx.products>();
    for (const p of ctx.products) {
      const cat = p.categoryName || 'Other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(p);
    }

    for (const [cat, products] of byCategory) {
      sections.push(`\n**${cat}** (${products.length}):`);
      for (const p of products) {
        const price = p.priceInCents > 0 ? ` - $${(p.priceInCents / 100).toFixed(2)}` : '';
        const featured = p.isFeatured ? ' [Featured]' : '';
        const desc = p.description ? `: ${p.description.slice(0, 80)}` : '';
        sections.push(`- ${p.name}${price}${featured}${desc}`);
      }
    }

    // Extract unique brands/manufacturers from product tags and names
    const brands = new Set<string>();
    for (const p of ctx.products) {
      if (p.tags && p.tags.length > 0) {
        // First tag is often the brand (from seed scripts)
        brands.add(p.tags[0]);
      }
    }
    if (brands.size > 0) {
      sections.push(`\n**Brands/Manufacturers:** ${[...brands].join(', ')}`);
    }
  }

  // FAQs
  sections.push('');
  const faqCount = ctx.faqs.length;
  sections.push(`## FAQs (${faqCount})`);
  if (faqCount === 0) {
    sections.push('None configured');
  } else {
    const limit = 10;
    const displayed = ctx.faqs.slice(0, limit);
    for (const f of displayed) {
      sections.push(`- Q: ${f.question}`);
      sections.push(`  A: ${f.answer}`);
    }
    if (faqCount > limit) {
      sections.push(`and ${faqCount - limit} more...`);
    }
  }

  // Promotions
  sections.push('');
  const promoCount = ctx.promotions.length;
  sections.push(`## Promotions (${promoCount})`);
  if (promoCount === 0) {
    sections.push('None active');
  } else {
    for (const p of ctx.promotions) {
      const discount =
        p.discountType === 'percentage'
          ? `${p.discountValue}% off`
          : `$${(p.discountValue / 100).toFixed(2)} off`;
      sections.push(`- ${p.title}: ${discount}`);
    }
  }

  // Booking
  sections.push('');
  sections.push('## Booking');
  sections.push(formatBooking(ctx.booking));

  // Ordering
  sections.push('');
  sections.push('## Ordering');
  sections.push(formatOrdering(ctx.ordering));

  // Website (key business context for the LLM)
  sections.push('');
  sections.push('## About the Business (from website)');
  if (ctx.website.scraped?.combinedContent) {
    // Include a focused excerpt of the website content.
    // The first 6000 chars typically cover the homepage and about pages
    // which contain the most important business facts (capacity, history,
    // certifications, packaging, locations).
    const content = ctx.website.scraped.combinedContent.slice(0, 6000);
    sections.push(content);
    if (ctx.website.scraped.combinedContent.length > 6000) {
      sections.push(`(${Math.round(ctx.website.scraped.combinedContent.length / 1000)}K total chars available)`);
    }
  } else if (ctx.website.url) {
    sections.push(`URL: ${ctx.website.url}`);
  } else {
    sections.push('Not configured');
  }

  // Brand Voice
  sections.push('');
  sections.push('## Brand Voice');
  sections.push(formatBrandVoice(ctx.brand.voice));

  // Extensions (if present)
  if (ctx._extensions && Object.keys(ctx._extensions).length > 0) {
    sections.push('');
    sections.push('## Extensions');
    for (const [key, value] of Object.entries(ctx._extensions)) {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
      sections.push(`${key}: ${serialized}`);
    }
  }

  return sections.join('\n');
}

// =============================================================================
// Internal Formatters
// =============================================================================

function formatAddress(address: DataContext['contact']['address']): string {
  if (!address) return 'Not available';

  const parts = [address.street, address.city, address.state, address.zip, address.country].filter(
    Boolean
  );

  return parts.length > 0 ? parts.join(', ') : 'Not available';
}

function formatSocialMedia(social: DataContext['contact']['socialMedia']): string {
  if (!social) return 'Not available';

  const entries = Object.entries(social).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return 'Not available';

  return entries.map(([platform, url]) => `${platform}: ${url}`).join(', ');
}

function formatHours(hours: DataContext['hours']): string {
  if (!hours) return 'Not configured';
  if (hours.length === 0) return 'Not configured';

  return hours
    .map((h) => {
      const dayName = DAY_NAMES[h.dayOfWeek] || `Day ${h.dayOfWeek}`;
      if (!h.isActive) return `${dayName}: Closed`;
      return `${dayName}: ${h.startTime} - ${h.endTime}`;
    })
    .join('\n');
}

function formatBooking(booking: DataContext['booking']): string {
  if (!booking) return 'Not enabled';

  const parts = [
    `Timezone: ${booking.timezone}`,
    `Auto-confirm: ${booking.autoConfirm ? 'Yes' : 'No'}`,
    `Advance booking: ${booking.minAdvanceMinutes} min to ${booking.maxAdvanceDays} days`,
    `Cancellation window: ${booking.cancellationMinutes} min`,
    booking.depositRequired
      ? `Deposit: ${booking.depositType === 'percentage' ? `${booking.depositAmount}%` : `$${(booking.depositAmount / 100).toFixed(2)}`}`
      : 'No deposit required',
  ];

  return parts.join('\n');
}

function formatOrdering(ordering: DataContext['ordering']): string {
  if (!ordering) return 'Not enabled';

  const modes = [];
  if (ordering.enableDineIn) modes.push('Dine-in');
  if (ordering.enablePickup) modes.push('Pickup');

  const parts = [
    `Modes: ${modes.length > 0 ? modes.join(', ') : 'None'}`,
    `Min order: $${(ordering.minOrderInCents / 100).toFixed(2)}`,
    `Tax rate: ${(ordering.taxRate * 100).toFixed(1)}%`,
    ordering.enableTipping ? `Tipping: Yes (${ordering.tipOptions.join(', ')}%)` : 'Tipping: No',
  ];

  return parts.join('\n');
}

function formatWebsite(website: DataContext['website']): string {
  if (!website.url && !website.scraped) return 'Not configured';

  const parts: string[] = [];
  if (website.url) parts.push(`URL: ${website.url}`);
  if (website.publishStatus) parts.push(`Status: ${website.publishStatus}`);

  if (website.scraped) {
    // Include page structure (titles + descriptions, capped at 10 pages)
    const pages = website.scraped.pages.slice(0, 10);
    if (pages.length > 0) {
      parts.push('');
      parts.push('### Site Pages');
      for (const page of pages) {
        const desc = page.description ? `: ${page.description}` : '';
        parts.push(`- ${page.title || page.url}${desc}`);
      }
      if (website.scraped.pages.length > 10) {
        parts.push(`and ${website.scraped.pages.length - 10} more pages...`);
      }
    }

    // Include combinedContent (capped at 30K chars for dashboard agents)
    if (website.scraped.combinedContent) {
      const content = website.scraped.combinedContent.slice(0, 30000);
      parts.push('');
      parts.push('### Website Content');
      parts.push(content);
      if (website.scraped.combinedContent.length > 30000) {
        parts.push('(content truncated)');
      }
    }
  }

  return parts.join('\n');
}

function formatBrandVoice(voice: DataContext['brand']['voice']): string {
  if (!voice) return 'Not analyzed';

  return [
    `Company: ${voice.companyName}`,
    `Industry: ${voice.industry}`,
    `Main offerings: ${voice.mainOfferings.join(', ')}`,
    `Voice: ${voice.brandVoice}`,
  ].join('\n');
}

// =============================================================================
// Field Summary Builder
// =============================================================================

function buildFieldSummary(ctx: DataContext): string {
  const { availableFields, missingFields, emptyCollections } = ctx._meta;
  const lines: string[] = ['## Data Availability'];

  if (availableFields.length > 0) {
    lines.push(`Available: ${availableFields.join(', ')}`);
  }

  if (missingFields.length > 0) {
    lines.push(`Missing: ${missingFields.join(', ')}`);
  }

  if (emptyCollections.length > 0) {
    lines.push(`Empty collections: ${emptyCollections.join(', ')}`);
  }

  if (ctx._meta.loadError) {
    lines.push(`Load error: ${ctx._meta.loadError}`);
  }

  return lines.join('\n');
}
