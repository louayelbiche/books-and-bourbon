/**
 * PanelsModule — Panel stack management for BIB agents
 *
 * Manages a panel item stack with configurable max capacity.
 * Panels are used to display collections of cards in the dashboard.
 *
 * Contributes 1 tool: panel_push (pushes rendered card to panel)
 *
 * @see spec Phase 3a — PanelsModule
 */

import type { BibAgentModule } from './types.js';
import type { BibTool } from '../tools/types.js';

// =============================================================================
// Types
// =============================================================================

export interface PanelConfig {
  /** Maximum items in the panel stack (default 10) */
  maxItems?: number;

  /** Per-agent card rendering dispatch */
  renderCard?: (type: string, data: unknown) => Record<string, unknown>;
}

// =============================================================================
// PanelsModule
// =============================================================================

export class PanelsModule implements BibAgentModule {
  readonly name = 'panels';

  /** Panel item stack */
  private items: Record<string, unknown>[] = [];

  /** Maximum items to keep */
  private readonly maxItems: number;

  /** Card rendering dispatch function */
  private readonly renderCardFn?: (type: string, data: unknown) => Record<string, unknown>;

  /** Agent reference (set during initialize) */
  private agent: any;

  constructor(config?: PanelConfig) {
    this.maxItems = config?.maxItems ?? 10;
    this.renderCardFn = config?.renderCard;
  }

  // ---------------------------------------------------------------------------
  // BibAgentModule lifecycle
  // ---------------------------------------------------------------------------

  initialize(agent: any): void {
    this.agent = agent;
  }

  // ---------------------------------------------------------------------------
  // Panel Stack Operations
  // ---------------------------------------------------------------------------

  /**
   * Push an item to the panel stack.
   * If at capacity, drops the oldest item.
   */
  pushItem(item: Record<string, unknown>): void {
    this.items.push(item);
    if (this.items.length > this.maxItems) {
      this.items.shift();
    }
  }

  /**
   * Get a copy of all current panel items.
   * Returns a new array (not a reference to the internal state).
   */
  getItems(): Record<string, unknown>[] {
    return [...this.items];
  }

  /** Clear all items from the panel stack. */
  clear(): void {
    this.items = [];
  }

  /**
   * Render a card using the per-agent dispatch function.
   * Returns the rendered card data, or a fallback with the raw data.
   */
  renderCard(type: string, data: unknown): Record<string, unknown> {
    if (this.renderCardFn) {
      return this.renderCardFn(type, data);
    }
    return { type, data };
  }

  // ---------------------------------------------------------------------------
  // Tool Contribution
  // ---------------------------------------------------------------------------

  getTools(): BibTool[] {
    return [
      {
        name: 'panel_push',
        description: 'Push a rendered card to the panel stack',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'The card type to render' },
            data: { type: 'object', description: 'The card data to render' },
          },
          required: ['type', 'data'],
        },
        tier: 'extension',
        execute: async (args) => {
          const type = args.type as string;
          const data = args.data as Record<string, unknown>;
          const rendered = this.renderCard(type, data);
          this.pushItem(rendered);
          return { pushed: true, count: this.items.length };
        },
      },
    ];
  }
}
