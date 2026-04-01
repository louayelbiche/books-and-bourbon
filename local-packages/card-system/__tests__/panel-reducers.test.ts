import { describe, test, expect } from 'vitest';
import { panelReducers } from '../src/hooks/usePanel.js';
import type { PanelItem } from '../src/hooks/usePanel.js';

function makeItem(id: string, overrides: Partial<PanelItem> = {}): PanelItem {
  return {
    id,
    type: 'test-card',
    cardId: `card-${id}`,
    data: {},
    pinned: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('panelReducers', () => {
  // --- evict ---

  describe('evict', () => {
    test('returns items unchanged when under maxItems', () => {
      const items = [makeItem('a'), makeItem('b')];
      const result = panelReducers.evict(items, 5, new Set());
      expect(result).toBe(items); // same reference
    });

    test('evicts oldest non-pinned item when over maxItems', () => {
      const items = [
        makeItem('a', { timestamp: 100 }),
        makeItem('b', { timestamp: 200 }),
        makeItem('c', { timestamp: 300 }),
      ];
      const result = panelReducers.evict(items, 2, new Set());
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['b', 'c']);
    });

    test('skips pinned items during eviction', () => {
      const items = [
        makeItem('a', { timestamp: 100, pinned: true }),
        makeItem('b', { timestamp: 200 }),
        makeItem('c', { timestamp: 300 }),
      ];
      const result = panelReducers.evict(items, 2, new Set());
      expect(result).toHaveLength(2);
      // 'a' is pinned so 'b' (oldest non-pinned) is evicted
      expect(result.map((i) => i.id)).toEqual(['a', 'c']);
    });

    test('skips default items during eviction', () => {
      const items = [
        makeItem('default-1', { timestamp: 100 }),
        makeItem('b', { timestamp: 200 }),
        makeItem('c', { timestamp: 300 }),
      ];
      const defaultIds = new Set(['default-1']);
      const result = panelReducers.evict(items, 2, defaultIds);
      expect(result).toHaveLength(2);
      // default-1 is protected so 'b' is evicted
      expect(result.map((i) => i.id)).toEqual(['default-1', 'c']);
    });

    test('returns unchanged when all items are pinned or default', () => {
      const items = [
        makeItem('default-1', { timestamp: 100 }),
        makeItem('b', { timestamp: 200, pinned: true }),
        makeItem('c', { timestamp: 300, pinned: true }),
      ];
      const defaultIds = new Set(['default-1']);
      const result = panelReducers.evict(items, 2, defaultIds);
      // Nothing evictable — returns all 3
      expect(result).toHaveLength(3);
    });
  });

  // --- push ---

  describe('push', () => {
    test('adds item to the front of the stack', () => {
      const items = [makeItem('a')];
      const newItem = makeItem('b');
      const result = panelReducers.push(items, newItem, 10, new Set());
      expect(result[0].id).toBe('b');
      expect(result[1].id).toBe('a');
    });

    test('replaces existing item with same id', () => {
      const items = [
        makeItem('a', { data: { old: true } }),
        makeItem('b'),
      ];
      const updated = makeItem('a', { data: { new: true } });
      const result = panelReducers.push(items, updated, 10, new Set());
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a');
      expect(result[0].data).toEqual({ new: true });
    });

    test('triggers eviction when exceeding maxItems', () => {
      const items = [
        makeItem('a', { timestamp: 100 }),
        makeItem('b', { timestamp: 200 }),
      ];
      const newItem = makeItem('c', { timestamp: 300 });
      const result = panelReducers.push(items, newItem, 2, new Set());
      expect(result).toHaveLength(2);
      // 'a' (oldest) evicted, 'c' added to front
      expect(result.map((i) => i.id)).toEqual(['c', 'b']);
    });

    test('push to empty stack', () => {
      const result = panelReducers.push([], makeItem('a'), 10, new Set());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });
  });

  // --- update ---

  describe('update', () => {
    test('updates matching item fields', () => {
      const items = [
        makeItem('a', { data: { name: 'old' } }),
        makeItem('b'),
      ];
      const result = panelReducers.update(items, 'a', { data: { name: 'new' } });
      expect(result[0].data).toEqual({ name: 'new' });
      expect(result[1].id).toBe('b'); // untouched
    });

    test('returns same reference for unknown itemId', () => {
      const items = [makeItem('a')];
      const result = panelReducers.update(items, 'nonexistent', { data: { x: 1 } });
      expect(result).toBe(items); // identity — no mutation
    });

    test('preserves non-updated fields', () => {
      const items = [makeItem('a', { type: 'card-x', pinned: false })];
      const result = panelReducers.update(items, 'a', { pinned: true });
      expect(result[0].type).toBe('card-x');
      expect(result[0].pinned).toBe(true);
    });
  });

  // --- remove ---

  describe('remove', () => {
    test('removes matching item', () => {
      const items = [makeItem('a'), makeItem('b'), makeItem('c')];
      const result = panelReducers.remove(items, 'b');
      expect(result).toHaveLength(2);
      expect(result.map((i) => i.id)).toEqual(['a', 'c']);
    });

    test('returns same items when id not found', () => {
      const items = [makeItem('a')];
      const result = panelReducers.remove(items, 'nonexistent');
      expect(result).toHaveLength(1);
    });

    test('can remove pinned items', () => {
      const items = [makeItem('a', { pinned: true })];
      const result = panelReducers.remove(items, 'a');
      expect(result).toHaveLength(0);
    });

    test('can remove default items', () => {
      const items = [makeItem('default-1')];
      const result = panelReducers.remove(items, 'default-1');
      expect(result).toHaveLength(0);
    });
  });

  // --- pin / unpin ---

  describe('pin', () => {
    test('sets pinned to true', () => {
      const items = [makeItem('a', { pinned: false })];
      const result = panelReducers.pin(items, 'a');
      expect(result[0].pinned).toBe(true);
    });

    test('is idempotent for already-pinned items', () => {
      const items = [makeItem('a', { pinned: true })];
      const result = panelReducers.pin(items, 'a');
      expect(result[0].pinned).toBe(true);
    });

    test('does not affect other items', () => {
      const items = [makeItem('a', { pinned: false }), makeItem('b', { pinned: false })];
      const result = panelReducers.pin(items, 'a');
      expect(result[0].pinned).toBe(true);
      expect(result[1].pinned).toBe(false);
    });
  });

  describe('unpin', () => {
    test('sets pinned to false', () => {
      const items = [makeItem('a', { pinned: true })];
      const result = panelReducers.unpin(items, 'a');
      expect(result[0].pinned).toBe(false);
    });

    test('is idempotent for already-unpinned items', () => {
      const items = [makeItem('a', { pinned: false })];
      const result = panelReducers.unpin(items, 'a');
      expect(result[0].pinned).toBe(false);
    });
  });

  // --- combined scenarios ---

  describe('combined scenarios', () => {
    test('pinned items survive eviction after multiple pushes', () => {
      const defaultIds = new Set<string>();
      let items: PanelItem[] = [];

      // Push and pin item 'a'
      items = panelReducers.push(items, makeItem('a', { timestamp: 100 }), 3, defaultIds);
      items = panelReducers.pin(items, 'a');

      // Fill stack to capacity
      items = panelReducers.push(items, makeItem('b', { timestamp: 200 }), 3, defaultIds);
      items = panelReducers.push(items, makeItem('c', { timestamp: 300 }), 3, defaultIds);

      // Push one more — should evict 'b' (oldest non-pinned), not 'a'
      items = panelReducers.push(items, makeItem('d', { timestamp: 400 }), 3, defaultIds);

      expect(items).toHaveLength(3);
      expect(items.map((i) => i.id)).toContain('a'); // pinned — survived
      expect(items.map((i) => i.id)).not.toContain('b'); // evicted
    });

    test('update + pin + eviction interaction', () => {
      const defaultIds = new Set<string>();
      let items: PanelItem[] = [
        makeItem('a', { timestamp: 100 }),
        makeItem('b', { timestamp: 200 }),
      ];

      // Update 'a' data
      items = panelReducers.update(items, 'a', { data: { updated: true } });
      expect(items[0].data).toEqual({ updated: true });

      // Pin 'a' then push to trigger eviction
      items = panelReducers.pin(items, 'a');
      items = panelReducers.push(items, makeItem('c', { timestamp: 300 }), 2, defaultIds);

      // 'b' evicted, 'a' survives with updated data
      expect(items.map((i) => i.id)).toContain('a');
      const a = items.find((i) => i.id === 'a')!;
      expect(a.data).toEqual({ updated: true });
      expect(a.pinned).toBe(true);
    });

    test('default items are preserved through push cycles', () => {
      const defaultIds = new Set(['default-1']);
      let items: PanelItem[] = [makeItem('default-1', { timestamp: 1 })];

      // Push items up to capacity
      items = panelReducers.push(items, makeItem('a', { timestamp: 100 }), 2, defaultIds);
      items = panelReducers.push(items, makeItem('b', { timestamp: 200 }), 2, defaultIds);

      // 'a' evicted (oldest non-default), default-1 survives
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.id)).toContain('default-1');
      expect(items.map((i) => i.id)).toContain('b');
    });
  });
});
