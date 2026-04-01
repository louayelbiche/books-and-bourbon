/**
 * Tests for PanelsModule
 *
 * Verifies:
 * - Constructor defaults (maxItems=10)
 * - Constructor with custom config
 * - pushItem adds to items
 * - pushItem caps at maxItems (drops oldest)
 * - getItems returns copy (not reference)
 * - clear empties items
 * - renderCard uses config dispatch
 * - panel_push tool pushes rendered card
 * - panel_push tool returns count
 *
 * @see spec Phase 3a — PanelsModule
 */

import { describe, it, expect, vi } from 'vitest';
import { PanelsModule } from '../../src/modules/panels.js';

describe('PanelsModule', () => {
  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('creates module with name "panels"', () => {
      const mod = new PanelsModule();
      expect(mod.name).toBe('panels');
    });

    it('defaults maxItems to 10', () => {
      const mod = new PanelsModule();

      // Push 11 items — only 10 should remain
      for (let i = 0; i < 11; i++) {
        mod.pushItem({ index: i });
      }

      expect(mod.getItems()).toHaveLength(10);
    });

    it('accepts custom maxItems via config', () => {
      const mod = new PanelsModule({ maxItems: 3 });

      for (let i = 0; i < 5; i++) {
        mod.pushItem({ index: i });
      }

      expect(mod.getItems()).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // pushItem
  // ---------------------------------------------------------------------------

  describe('pushItem', () => {
    it('adds item to the stack', () => {
      const mod = new PanelsModule();
      mod.pushItem({ name: 'card1' });

      expect(mod.getItems()).toHaveLength(1);
      expect(mod.getItems()[0]).toEqual({ name: 'card1' });
    });

    it('adds multiple items in order', () => {
      const mod = new PanelsModule();
      mod.pushItem({ index: 1 });
      mod.pushItem({ index: 2 });
      mod.pushItem({ index: 3 });

      const items = mod.getItems();
      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({ index: 1 });
      expect(items[2]).toEqual({ index: 3 });
    });

    it('caps at maxItems by dropping oldest', () => {
      const mod = new PanelsModule({ maxItems: 3 });

      mod.pushItem({ index: 1 });
      mod.pushItem({ index: 2 });
      mod.pushItem({ index: 3 });
      mod.pushItem({ index: 4 }); // should drop index:1

      const items = mod.getItems();
      expect(items).toHaveLength(3);
      expect(items[0]).toEqual({ index: 2 });
      expect(items[2]).toEqual({ index: 4 });
    });
  });

  // ---------------------------------------------------------------------------
  // getItems
  // ---------------------------------------------------------------------------

  describe('getItems', () => {
    it('returns a copy, not the internal reference', () => {
      const mod = new PanelsModule();
      mod.pushItem({ name: 'card1' });

      const items1 = mod.getItems();
      const items2 = mod.getItems();

      expect(items1).not.toBe(items2);
      expect(items1).toEqual(items2);
    });

    it('modifications to returned array do not affect internal state', () => {
      const mod = new PanelsModule();
      mod.pushItem({ name: 'card1' });

      const items = mod.getItems();
      items.push({ name: 'injected' });

      expect(mod.getItems()).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    it('empties all items', () => {
      const mod = new PanelsModule();
      mod.pushItem({ index: 1 });
      mod.pushItem({ index: 2 });

      mod.clear();

      expect(mod.getItems()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // renderCard
  // ---------------------------------------------------------------------------

  describe('renderCard', () => {
    it('uses config dispatch function when provided', () => {
      const renderFn = vi.fn().mockReturnValue({ rendered: true, type: 'product' });
      const mod = new PanelsModule({ renderCard: renderFn });

      const result = mod.renderCard('product', { id: 'p1' });

      expect(renderFn).toHaveBeenCalledWith('product', { id: 'p1' });
      expect(result).toEqual({ rendered: true, type: 'product' });
    });

    it('returns fallback with type and data when no dispatch', () => {
      const mod = new PanelsModule();

      const result = mod.renderCard('product', { id: 'p1' });

      expect(result).toEqual({ type: 'product', data: { id: 'p1' } });
    });
  });

  // ---------------------------------------------------------------------------
  // getTools
  // ---------------------------------------------------------------------------

  describe('getTools', () => {
    it('returns 1 tool (panel_push)', () => {
      const mod = new PanelsModule();
      const tools = mod.getTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('panel_push');
    });

    it('panel_push tool is extension tier', () => {
      const mod = new PanelsModule();
      const tools = mod.getTools();

      expect(tools[0].tier).toBe('extension');
    });
  });

  // ---------------------------------------------------------------------------
  // panel_push Tool Execution
  // ---------------------------------------------------------------------------

  describe('panel_push execution', () => {
    it('pushes rendered card to stack', async () => {
      const renderFn = vi.fn().mockReturnValue({ rendered: true, type: 'event' });
      const mod = new PanelsModule({ renderCard: renderFn });

      const tools = mod.getTools();
      const pushTool = tools[0];

      await pushTool.execute(
        { type: 'event', data: { id: 'e1' } },
        { dataContext: {} as any, tenantId: 't1', mode: 'dashboard' }
      );

      expect(mod.getItems()).toHaveLength(1);
      expect(mod.getItems()[0]).toEqual({ rendered: true, type: 'event' });
    });

    it('returns count after push', async () => {
      const mod = new PanelsModule();
      const tools = mod.getTools();
      const pushTool = tools[0];

      const result1 = await pushTool.execute(
        { type: 'product', data: { id: 'p1' } },
        { dataContext: {} as any, tenantId: 't1', mode: 'dashboard' }
      );

      expect(result1).toEqual({ pushed: true, count: 1 });

      const result2 = await pushTool.execute(
        { type: 'service', data: { id: 's1' } },
        { dataContext: {} as any, tenantId: 't1', mode: 'dashboard' }
      );

      expect(result2).toEqual({ pushed: true, count: 2 });
    });
  });

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------

  describe('initialize', () => {
    it('stores agent reference without error', () => {
      const mod = new PanelsModule();
      const mockAgent = { agentType: 'test' };

      expect(() => mod.initialize(mockAgent)).not.toThrow();
    });
  });
});
