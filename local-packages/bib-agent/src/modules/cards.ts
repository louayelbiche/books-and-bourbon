/**
 * CardsModule — Card rendering and emission for BIB agents
 *
 * Provides two card emission paths:
 * - buildCardFromDB(id, type) — DB-backed cards (most agents)
 * - emitDirect(data) — computed cards (AI Advisor metric cards)
 *
 * Card mappers are registered per-agent to transform raw DB data
 * into the card format expected by the frontend.
 *
 * Contributes 3 tools: show_product_card, show_service_card, show_event_card
 *
 * @see spec Phase 3a — CardsModule
 */

import type { BibAgentModule } from './types.js';
import type { BibTool } from '../tools/types.js';

// =============================================================================
// Types
// =============================================================================

/** Transforms raw data into a card-renderable record */
export type CardMapper = (data: unknown) => Record<string, unknown>;

// =============================================================================
// CardsModule
// =============================================================================

export class CardsModule implements BibAgentModule {
  readonly name = 'cards';

  /** Registered card type mappers */
  private mappers = new Map<string, CardMapper>();

  /** Agent reference (set during initialize) */
  private agent: any;

  // ---------------------------------------------------------------------------
  // BibAgentModule lifecycle
  // ---------------------------------------------------------------------------

  initialize(agent: any): void {
    this.agent = agent;
  }

  // ---------------------------------------------------------------------------
  // Mapper Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a mapper for a card type.
   * Mappers transform raw DB/API data into card-renderable records.
   */
  registerCardMapper(type: string, mapper: CardMapper): void {
    this.mappers.set(type, mapper);
  }

  /**
   * Get the registered mapper for a card type.
   * Returns undefined if no mapper is registered for the type.
   */
  getMapper(type: string): CardMapper | undefined {
    return this.mappers.get(type);
  }

  // ---------------------------------------------------------------------------
  // Card Emission
  // ---------------------------------------------------------------------------

  /**
   * Build a card from DB data using a registered mapper.
   * Returns null if no mapper is registered for the type.
   */
  buildCardFromDB(id: string, type: string): Record<string, unknown> | null {
    const mapper = this.mappers.get(type);
    if (!mapper) return null;
    return mapper({ id, type });
  }

  /**
   * Emit a computed card directly (no DB lookup).
   * Adds source='computed' to distinguish from DB-backed cards.
   */
  emitDirect(data: Record<string, unknown>): Record<string, unknown> {
    return { ...data, source: 'computed' };
  }

  // ---------------------------------------------------------------------------
  // Tool Contribution
  // ---------------------------------------------------------------------------

  getTools(): BibTool[] {
    return [
      this.createCardTool('show_product_card', 'Display a product card', 'product'),
      this.createCardTool('show_service_card', 'Display a service card', 'service'),
      this.createCardTool('show_event_card', 'Display an event card', 'event'),
    ];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private createCardTool(name: string, description: string, cardType: string): BibTool {
    return {
      name,
      description,
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: `The ${cardType} ID to display` },
        },
        required: ['id'],
      },
      tier: 'extension',
      execute: async (args) => {
        const id = args.id as string;
        const card = this.buildCardFromDB(id, cardType);
        return card ?? { error: `No mapper registered for card type: ${cardType}` };
      },
    };
  }
}
