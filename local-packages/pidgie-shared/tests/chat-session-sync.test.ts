import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatSessionSync, type SyncState } from '../src/sync/chat-session-sync.js';

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private closed = false;

  static instances: MockBroadcastChannel[] = [];

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    if (this.closed) return;
    for (const instance of MockBroadcastChannel.instances) {
      if (instance !== this && instance.name === this.name && !instance.closed && instance.onmessage) {
        instance.onmessage(new MessageEvent('message', { data }));
      }
    }
  }

  close() {
    this.closed = true;
    const idx = MockBroadcastChannel.instances.indexOf(this);
    if (idx >= 0) MockBroadcastChannel.instances.splice(idx, 1);
  }
}

// Mock sessionStorage
const storage = new Map<string, string>();
const mockSessionStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size; },
  key: () => null,
};

beforeEach(() => {
  MockBroadcastChannel.instances = [];
  storage.clear();

  // Mock browser globals so the constructor doesn't bail out
  // @ts-expect-error - mocking globals
  globalThis.window = globalThis;
  // @ts-expect-error - mocking globals
  globalThis.BroadcastChannel = MockBroadcastChannel;
  // @ts-expect-error - mocking globals
  globalThis.sessionStorage = mockSessionStorage;

  // Mock document
  if (!globalThis.document) {
    // @ts-expect-error - partial mock
    globalThis.document = {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  } else {
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'removeEventListener').mockImplementation(() => {});
  }
});

afterEach(() => {
  // @ts-expect-error - cleanup mock
  delete globalThis.window;
  vi.restoreAllMocks();
});

describe('ChatSessionSync', () => {
  it('creates a BroadcastChannel with session-specific name', () => {
    const sync = new ChatSessionSync('session-123');
    expect(MockBroadcastChannel.instances.length).toBe(1);
    expect(MockBroadcastChannel.instances[0].name).toBe('chat-session-123');
    sync.destroy();
  });

  it('broadcasts messages to other tabs', () => {
    const sync1 = new ChatSessionSync('sess-1');
    const sync2 = new ChatSessionSync('sess-1');

    const received: SyncState[] = [];
    sync2.onStateUpdate = (state) => received.push(state);

    const messages = [{ role: 'user' as const, content: 'Hello' }];
    sync1.broadcast(messages[0], messages, []);

    expect(received.length).toBe(1);
    expect(received[0].messages).toEqual(messages);

    sync1.destroy();
    sync2.destroy();
  });

  it('does not sync across different session IDs', () => {
    const sync1 = new ChatSessionSync('sess-a');
    const sync2 = new ChatSessionSync('sess-b');

    const received: SyncState[] = [];
    sync2.onStateUpdate = (state) => received.push(state);

    sync1.broadcast(
      { role: 'user', content: 'Hello' },
      [{ role: 'user', content: 'Hello' }],
      []
    );

    expect(received).toHaveLength(0);
    sync1.destroy();
    sync2.destroy();
  });

  it('increments sequence numbers', () => {
    const sync1 = new ChatSessionSync('sess-seq');
    const sync2 = new ChatSessionSync('sess-seq');

    const received: SyncState[] = [];
    sync2.onStateUpdate = (state) => received.push(state);

    const msg1 = { role: 'user' as const, content: 'First' };
    const msg2 = { role: 'assistant' as const, content: 'Response' };

    sync1.broadcast(msg1, [msg1], []);
    sync1.broadcast(msg2, [msg1, msg2], []);

    expect(received).toHaveLength(2);
    expect(received[0].sequence).toBe(1);
    expect(received[1].sequence).toBe(2);

    sync1.destroy();
    sync2.destroy();
  });

  it('persists state to sessionStorage', () => {
    const sync = new ChatSessionSync('sess-store');
    const msg = { role: 'user' as const, content: 'Stored' };

    sync.broadcast(msg, [msg], ['Suggestion 1']);

    const stored = JSON.parse(storage.get('chat-sync-sess-store')!);
    expect(stored.messages).toEqual([msg]);
    expect(stored.suggestions).toEqual(['Suggestion 1']);
    expect(stored.sequence).toBe(1);

    sync.destroy();
  });

  it('broadcasts full state for bulk updates', () => {
    const sync1 = new ChatSessionSync('sess-bulk');
    const sync2 = new ChatSessionSync('sess-bulk');

    const received: SyncState[] = [];
    sync2.onStateUpdate = (state) => received.push(state);

    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there' },
    ];

    sync1.broadcastFullState(messages, ['Follow up?']);

    expect(received).toHaveLength(1);
    expect(received[0].messages).toEqual(messages);
    expect(received[0].suggestions).toEqual(['Follow up?']);

    sync1.destroy();
    sync2.destroy();
  });

  it('cleans up on destroy', () => {
    const sync = new ChatSessionSync('sess-cleanup');
    expect(MockBroadcastChannel.instances.length).toBe(1);

    sync.destroy();
    expect(MockBroadcastChannel.instances.length).toBe(0);
  });

  it('includes cards and actions in sync messages', () => {
    const sync1 = new ChatSessionSync('sess-cards');
    const sync2 = new ChatSessionSync('sess-cards');

    const received: SyncState[] = [];
    sync2.onStateUpdate = (state) => received.push(state);

    const msg = {
      role: 'assistant' as const,
      content: 'Here is a product',
      cards: [{
        id: 'p1',
        type: 'product' as const,
        title: 'Blue Shirt',
        url: 'https://shop.com/p1',
        generatedAt: Date.now(),
      }],
      actions: [{
        id: 'checkout',
        label: 'Checkout',
        type: 'navigate' as const,
        payload: 'https://shop.com/checkout',
        style: 'primary' as const,
      }],
    };

    sync1.broadcast(msg, [msg], []);

    expect(received).toHaveLength(1);
    expect(received[0].messages[0].cards).toHaveLength(1);
    expect(received[0].messages[0].cards![0].title).toBe('Blue Shirt');
    expect(received[0].messages[0].actions).toHaveLength(1);

    sync1.destroy();
    sync2.destroy();
  });

  it('does not fail when BroadcastChannel is unavailable', () => {
    // Remove BroadcastChannel to simulate unsupported
    // @ts-expect-error - removing mock
    delete globalThis.BroadcastChannel;

    // Should not throw
    const sync = new ChatSessionSync('sess-no-bc');
    sync.broadcast(
      { role: 'user', content: 'test' },
      [{ role: 'user', content: 'test' }],
      []
    );
    sync.destroy();
  });
});
