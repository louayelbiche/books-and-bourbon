/**
 * Identity Resolution Service
 *
 * Resolves visitor identity when contact info (email/phone/name) is provided.
 * Creates or links Customer records using a tiered matching strategy:
 *   1. Email (exact, strongest)
 *   2. Phone (exact, strong)
 *   3. Name (normalized first+last, medium; flagged for review if ambiguous)
 *
 * Two-layer architecture:
 *   Layer 1: Each BotVisitorProfile stays tied to its channel (one per channel per person).
 *   Layer 2: Customer record groups profiles. Can be unlinked if match is wrong.
 *
 * Trigger: any write tool that collects contact info
 * (create_booking, place_order, capture_lead, submit_request)
 */

type PrismaClient = any;

export type MatchMethod = 'email' | 'phone' | 'name' | 'none';

export interface ResolveIdentityInput {
  tenantId: string;
  visitorProfileId: string;
  email?: string;
  phone?: string;
  name?: string;
  /** Channel type from the visitor profile (for knownChannels tracking) */
  channelType?: string;
}

export interface ResolveIdentityResult {
  customerId: string;
  isNew: boolean;
  merged: boolean;
  matchMethod: MatchMethod;
  confidence: number; // 0.0-1.0
}

/** Normalize a name for matching: lowercase, trim, collapse whitespace */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Normalize phone: strip non-digits except leading + */
function normalizePhone(phone: string): string {
  const hasPlus = phone.startsWith('+');
  const digits = phone.replace(/\D/g, '');
  return hasPlus ? '+' + digits : digits;
}

export class IdentityResolutionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Resolve visitor identity when contact info is provided.
   * Tiered matching: email > phone > name.
   *
   * Safe to call multiple times (idempotent).
   * Non-blocking: callers should fire-and-forget with .catch().
   */
  async resolve(input: ResolveIdentityInput): Promise<ResolveIdentityResult | null> {
    const { tenantId, visitorProfileId, email, phone, name, channelType } = input;

    // Need at least one signal to resolve
    if (!email && !phone && !name) return null;

    try {
      let customer: any = null;
      let matchMethod: MatchMethod = 'none';
      let confidence = 0;
      let isNew = false;

      // Tier 1: Email match (strongest)
      if (email) {
        customer = await this.prisma.customer.findUnique({
          where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
        });
        if (customer) {
          matchMethod = 'email';
          confidence = 1.0;
        }
      }

      // Tier 2: Phone match (if no email match)
      if (!customer && phone) {
        const normalized = normalizePhone(phone);
        customer = await this.prisma.customer.findFirst({
          where: { tenantId, phone: normalized },
        });
        if (customer) {
          matchMethod = 'phone';
          confidence = 0.9;
        }
      }

      // Tier 3: Name match (if no email or phone match)
      if (!customer && name && name.includes(' ')) {
        const normalizedName = normalizeName(name);
        // Only match on names with at least first + last (space-separated)
        const candidates = await this.prisma.customer.findMany({
          where: { tenantId },
          select: { id: true, name: true, email: true },
        });

        const matches = candidates.filter((c: any) => normalizeName(c.name) === normalizedName);

        if (matches.length === 1) {
          customer = matches[0];
          matchMethod = 'name';
          confidence = 0.7;
        }
        // If multiple matches: ambiguous. Don't auto-link; leave as lead.
        // Could store as suggestedMatches in metadata for owner review.
      }

      // No match found: create new Customer (only if we have email or phone)
      if (!customer && (email || phone)) {
        customer = await this.prisma.customer.create({
          data: {
            tenantId,
            email: email?.toLowerCase() || `visitor-${visitorProfileId.slice(0, 8)}@unknown`,
            name: name || 'Unknown',
            phone: phone ? normalizePhone(phone) : null,
          },
        });
        isNew = true;
        matchMethod = email ? 'email' : 'phone';
        confidence = 1.0;
      }

      if (!customer) return null;

      // Enrich existing customer with new info
      if (!isNew) {
        const updates: Record<string, any> = {};
        if (phone && !customer.phone) updates.phone = normalizePhone(phone);
        if (name && customer.name === 'Unknown') updates.name = name;
        if (email && !customer.email?.includes('@')) updates.email = email.toLowerCase();
        if (Object.keys(updates).length > 0) {
          await this.prisma.customer.update({ where: { id: customer.id }, data: updates });
        }
      }

      // Update knownChannels on Customer (track all channels this customer uses)
      if (channelType) {
        await this.updateKnownChannels(customer.id, channelType);
      }

      // Link BotVisitorProfile to Customer
      let profile = await this.prisma.botVisitorProfile.findUnique({
        where: { id: visitorProfileId },
      }).catch(() => null);

      if (!profile) {
        profile = await this.prisma.botVisitorProfile.findFirst({
          where: { visitorKey: visitorProfileId, tenantId },
        }).catch(() => null);
      }

      if (!profile) return { customerId: customer.id, isNew, merged: false, matchMethod, confidence };

      let merged = false;

      if (profile.customerId !== customer.id) {
        await this.prisma.botVisitorProfile.update({
          where: { id: profile.id },
          data: { customerId: customer.id },
        });

        if (!isNew) {
          merged = await this.mergeFacts(customer.id);
        }
      }

      return { customerId: customer.id, isNew, merged, matchMethod, confidence };
    } catch (err) {
      // Unique constraint violation (race condition)
      if ((err as any)?.code === 'P2002' && email) {
        const existing = await this.prisma.customer.findUnique({
          where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
        });
        if (existing) {
          await this.prisma.botVisitorProfile.update({
            where: { id: visitorProfileId },
            data: { customerId: existing.id },
          }).catch(() => {});
          return { customerId: existing.id, isNew: false, merged: false, matchMethod: 'email', confidence: 1.0 };
        }
      }

      console.error('[identity-resolution] Error:', (err as Error).message);
      return null;
    }
  }

  /**
   * Track which channels a customer uses (e.g., ['whatsapp', 'instagram', 'cookie']).
   * Stored in Customer metadata for quick access.
   */
  private async updateKnownChannels(customerId: string, channelType: string): Promise<void> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { metadata: true },
      });

      const metadata = (customer?.metadata as any) || {};
      const knownChannels: string[] = metadata.knownChannels || [];

      if (!knownChannels.includes(channelType)) {
        knownChannels.push(channelType);
        await this.prisma.customer.update({
          where: { id: customerId },
          data: { metadata: { ...metadata, knownChannels } },
        });
      }
    } catch (err) {
      // Non-critical: don't fail resolution if channel tracking fails
      console.warn('[identity-resolution] knownChannels update failed:', (err as Error).message);
    }
  }

  /**
   * Merge contact facts from all profiles linked to the same Customer.
   * Union strategy: combine unique facts across profiles.
   */
  private async mergeFacts(customerId: string): Promise<boolean> {
    const profiles = await this.prisma.botVisitorProfile.findMany({
      where: { customerId },
    });

    if (profiles.length <= 1) return false;

    const allFacts = new Map<string, unknown>();
    for (const p of profiles) {
      const profileJson = typeof p.profileJson === 'string'
        ? JSON.parse(p.profileJson)
        : p.profileJson || {};
      const facts = profileJson.facts || [];
      for (const fact of facts) {
        if (fact.key && !allFacts.has(fact.key)) {
          allFacts.set(fact.key, fact);
        }
      }
    }

    if (allFacts.size === 0) return false;

    const mergedFacts = Array.from(allFacts.values());
    let updated = false;

    for (const p of profiles) {
      const profileJson = typeof p.profileJson === 'string'
        ? JSON.parse(p.profileJson)
        : p.profileJson || {};
      const currentFacts = profileJson.facts || [];

      if (currentFacts.length < mergedFacts.length) {
        await this.prisma.botVisitorProfile.update({
          where: { id: p.id },
          data: {
            profileJson: {
              ...profileJson,
              facts: mergedFacts,
            },
          },
        });
        updated = true;
      }
    }

    return updated;
  }
}
