import { describe, it, expect, vi } from 'vitest';
import { createPersistenceAdapter } from '../src/conversation/adapter.js';

function createMockStore() {
  return {
    create: vi.fn().mockResolvedValue('conv-new-123'),
    getBySessionId: vi.fn().mockResolvedValue(null),
    addMessage: vi.fn().mockResolvedValue('msg-456'),
    // Other methods not used by the adapter
    listByVisitor: vi.fn(),
    getMessages: vi.fn(),
    getWithMessages: vi.fn(),
    updateMetadata: vi.fn(),
    deleteOlderThan: vi.fn(),
  };
}

describe('createPersistenceAdapter', () => {
  it('creates new conversation when none exists for session', async () => {
    const store = createMockStore();
    const adapter = createPersistenceAdapter(store as never);

    const id = await adapter.getOrCreateConversation('vis-1', 'sess-1', 'test-app', { locale: 'en' });

    expect(id).toBe('conv-new-123');
    expect(store.getBySessionId).toHaveBeenCalledWith('sess-1');
    expect(store.create).toHaveBeenCalledWith('vis-1', 'sess-1', 'test-app', { locale: 'en' });
  });

  it('returns existing conversation ID when session already has one', async () => {
    const store = createMockStore();
    store.getBySessionId.mockResolvedValue({ id: 'conv-existing-789' });
    const adapter = createPersistenceAdapter(store as never);

    const id = await adapter.getOrCreateConversation('vis-1', 'sess-1', 'test-app');

    expect(id).toBe('conv-existing-789');
    expect(store.create).not.toHaveBeenCalled();
  });

  it('logs user message via addMessage', async () => {
    const store = createMockStore();
    const adapter = createPersistenceAdapter(store as never);

    await adapter.logMessage('conv-1', 'user', 'Hello');

    expect(store.addMessage).toHaveBeenCalledWith('conv-1', 'user', 'Hello', undefined);
  });

  it('logs assistant message with extras', async () => {
    const store = createMockStore();
    const adapter = createPersistenceAdapter(store as never);

    await adapter.logMessage('conv-1', 'assistant', 'Hi there', {
      toolCalls: [{ name: 'search_products' }],
      responseLatencyMs: 350,
    });

    expect(store.addMessage).toHaveBeenCalledWith('conv-1', 'assistant', 'Hi there', {
      toolCalls: [{ name: 'search_products' }],
      responseLatencyMs: 350,
    });
  });

  it('passes undefined metadata when not provided', async () => {
    const store = createMockStore();
    const adapter = createPersistenceAdapter(store as never);

    await adapter.getOrCreateConversation('vis-1', 'sess-1', 'my-app');

    expect(store.create).toHaveBeenCalledWith('vis-1', 'sess-1', 'my-app', undefined);
  });
});
