/**
 * Tests for CardsModule
 *
 * Verifies:
 * - Constructor creates module with name 'cards'
 * - registerCardMapper stores mapper
 * - getMapper returns registered mapper, undefined for unknown
 * - buildCardFromDB returns mapped data when mapper exists
 * - buildCardFromDB returns null when no mapper
 * - emitDirect returns data with source='computed'
 * - getTools() returns 3 tools
 * - Card tools execute and call buildCardFromDB
 *
 * @see spec Phase 3a — CardsModule
 */

import { describe, it, expect, vi } from 'vitest';
import { CardsModule } from '../../src/modules/cards.js';
import type { CardMapper } from '../../src/modules/cards.js';

describe('CardsModule', () => {
  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('creates module with name "cards"', () => {
      const mod = new CardsModule();
      expect(mod.name).toBe('cards');
    });
  });

  // ---------------------------------------------------------------------------
  // Card Mapper Registration
  // ---------------------------------------------------------------------------

  describe('registerCardMapper / getMapper', () => {
    it('stores and retrieves a mapper', () => {
      const mod = new CardsModule();
      const mapper: CardMapper = (data) => ({ mapped: true, ...(data as Record<string, unknown>) });

      mod.registerCardMapper('product', mapper);

      expect(mod.getMapper('product')).toBe(mapper);
    });

    it('returns undefined for unknown type', () => {
      const mod = new CardsModule();

      expect(mod.getMapper('nonexistent')).toBeUndefined();
    });

    it('supports multiple mappers for different types', () => {
      const mod = new CardsModule();
      const productMapper: CardMapper = () => ({ type: 'product' });
      const serviceMapper: CardMapper = () => ({ type: 'service' });

      mod.registerCardMapper('product', productMapper);
      mod.registerCardMapper('service', serviceMapper);

      expect(mod.getMapper('product')).toBe(productMapper);
      expect(mod.getMapper('service')).toBe(serviceMapper);
    });
  });

  // ---------------------------------------------------------------------------
  // buildCardFromDB
  // ---------------------------------------------------------------------------

  describe('buildCardFromDB', () => {
    it('returns mapped data when mapper exists', () => {
      const mod = new CardsModule();
      mod.registerCardMapper('product', (data) => ({
        rendered: true,
        ...(data as Record<string, unknown>),
      }));

      const result = mod.buildCardFromDB('p1', 'product');

      expect(result).toEqual({ rendered: true, id: 'p1', type: 'product' });
    });

    it('returns null when no mapper registered for type', () => {
      const mod = new CardsModule();

      const result = mod.buildCardFromDB('p1', 'unknown');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // emitDirect
  // ---------------------------------------------------------------------------

  describe('emitDirect', () => {
    it('returns data with source="computed"', () => {
      const mod = new CardsModule();

      const result = mod.emitDirect({ metric: 'revenue', value: 42000 });

      expect(result).toEqual({
        metric: 'revenue',
        value: 42000,
        source: 'computed',
      });
    });

    it('does not mutate original data', () => {
      const mod = new CardsModule();
      const original = { metric: 'profit' };

      mod.emitDirect(original);

      expect(original).toEqual({ metric: 'profit' });
      expect((original as any).source).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getTools
  // ---------------------------------------------------------------------------

  describe('getTools', () => {
    it('returns 3 tools', () => {
      const mod = new CardsModule();
      const tools = mod.getTools();

      expect(tools).toHaveLength(3);
    });

    it('returns show_product_card, show_service_card, show_event_card', () => {
      const mod = new CardsModule();
      const tools = mod.getTools();
      const names = tools.map((t) => t.name);

      expect(names).toContain('show_product_card');
      expect(names).toContain('show_service_card');
      expect(names).toContain('show_event_card');
    });

    it('tools are extension tier', () => {
      const mod = new CardsModule();
      const tools = mod.getTools();

      for (const tool of tools) {
        expect(tool.tier).toBe('extension');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Card Tool Execution
  // ---------------------------------------------------------------------------

  describe('card tool execution', () => {
    it('show_product_card calls buildCardFromDB with product type', async () => {
      const mod = new CardsModule();
      mod.registerCardMapper('product', (data) => ({
        rendered: true,
        ...(data as Record<string, unknown>),
      }));

      const tools = mod.getTools();
      const productTool = tools.find((t) => t.name === 'show_product_card')!;

      const result = await productTool.execute(
        { id: 'prod-1' },
        { dataContext: {} as any, tenantId: 't1', mode: 'dashboard' }
      );

      expect(result).toEqual({ rendered: true, id: 'prod-1', type: 'product' });
    });

    it('show_service_card calls buildCardFromDB with service type', async () => {
      const mod = new CardsModule();
      mod.registerCardMapper('service', (data) => ({
        serviceCard: true,
        ...(data as Record<string, unknown>),
      }));

      const tools = mod.getTools();
      const serviceTool = tools.find((t) => t.name === 'show_service_card')!;

      const result = await serviceTool.execute(
        { id: 'svc-1' },
        { dataContext: {} as any, tenantId: 't1', mode: 'dashboard' }
      );

      expect(result).toEqual({ serviceCard: true, id: 'svc-1', type: 'service' });
    });

    it('returns error when no mapper registered', async () => {
      const mod = new CardsModule();

      const tools = mod.getTools();
      const eventTool = tools.find((t) => t.name === 'show_event_card')!;

      const result = await eventTool.execute(
        { id: 'evt-1' },
        { dataContext: {} as any, tenantId: 't1', mode: 'dashboard' }
      );

      expect(result).toEqual({ error: 'No mapper registered for card type: event' });
    });
  });

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------

  describe('initialize', () => {
    it('stores agent reference without error', () => {
      const mod = new CardsModule();
      const mockAgent = { agentType: 'test' };

      expect(() => mod.initialize(mockAgent)).not.toThrow();
    });
  });
});
