/**
 * usePanel — Panel state management hook
 *
 * Manages the side panel item stack: push, update, remove, pin/unpin.
 * State persists across messages (not tied to individual messages).
 *
 * Core state logic is extracted as pure functions (panelReducers)
 * for testability without React dependencies.
 */

'use client';

import { useState, useCallback } from 'react';

/**
 * A single item in the panel stack.
 */
export interface PanelItem {
  id: string;
  type: string;
  cardId: string;
  data: Record<string, unknown>;
  pinned: boolean;
  timestamp: number;
}

interface UsePanelOptions {
  /** Maximum items in the stack (oldest non-pinned evicted when exceeded) */
  maxItems?: number;
  /** Default items that are always present */
  defaultItems?: PanelItem[];
}

export interface UsePanelReturn {
  items: PanelItem[];
  pushItem: (item: PanelItem) => void;
  updateItem: (itemId: string, updates: Partial<PanelItem>) => void;
  removeItem: (itemId: string) => void;
  pinItem: (itemId: string) => void;
  unpinItem: (itemId: string) => void;
  clearItems: () => void;
}

// --- Pure state reducers (testable without React) ---

export const panelReducers = {
  evict(current: PanelItem[], maxItems: number, defaultIds: Set<string>): PanelItem[] {
    if (current.length <= maxItems) return current;

    const evictable = current
      .filter((item) => !item.pinned && !defaultIds.has(item.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (evictable.length === 0) return current;

    const toEvict = evictable[0];
    return current.filter((item) => item.id !== toEvict.id);
  },

  push(items: PanelItem[], newItem: PanelItem, maxItems: number, defaultIds: Set<string>): PanelItem[] {
    const filtered = items.filter((p) => p.id !== newItem.id);
    const next = [newItem, ...filtered];
    return panelReducers.evict(next, maxItems, defaultIds);
  },

  update(items: PanelItem[], itemId: string, updates: Partial<PanelItem>): PanelItem[] {
    const exists = items.some((item) => item.id === itemId);
    if (!exists) return items;
    return items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item,
    );
  },

  remove(items: PanelItem[], itemId: string): PanelItem[] {
    return items.filter((item) => item.id !== itemId);
  },

  pin(items: PanelItem[], itemId: string): PanelItem[] {
    return items.map((item) =>
      item.id === itemId ? { ...item, pinned: true } : item,
    );
  },

  unpin(items: PanelItem[], itemId: string): PanelItem[] {
    return items.map((item) =>
      item.id === itemId ? { ...item, pinned: false } : item,
    );
  },
};

// --- React hook (thin wrapper) ---

export function usePanel(options: UsePanelOptions = {}): UsePanelReturn {
  const { maxItems = 10, defaultItems = [] } = options;
  const defaultIds = new Set(defaultItems.map((d) => d.id));

  const [items, setItems] = useState<PanelItem[]>(() => [...defaultItems]);

  const pushItem = useCallback(
    (item: PanelItem) => {
      setItems((prev) => panelReducers.push(prev, item, maxItems, defaultIds));
    },
    [maxItems, defaultIds],
  );

  const updateItem = useCallback(
    (itemId: string, updates: Partial<PanelItem>) => {
      setItems((prev) => panelReducers.update(prev, itemId, updates));
    },
    [],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setItems((prev) => panelReducers.remove(prev, itemId));
    },
    [],
  );

  const pinItem = useCallback(
    (itemId: string) => {
      setItems((prev) => panelReducers.pin(prev, itemId));
    },
    [],
  );

  const unpinItem = useCallback(
    (itemId: string) => {
      setItems((prev) => panelReducers.unpin(prev, itemId));
    },
    [],
  );

  const clearItems = useCallback(() => {
    setItems([...defaultItems]);
  }, [defaultItems]);

  return {
    items,
    pushItem,
    updateItem,
    removeItem,
    pinItem,
    unpinItem,
    clearItems,
  };
}
