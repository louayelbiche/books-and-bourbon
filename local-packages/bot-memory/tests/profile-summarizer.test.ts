import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileSummarizer } from '../src/profile/summarizer.js';
import type { VisitorProfile } from '../src/visitor/types.js';
import type { MessageRecord } from '../src/conversation/types.js';

function makeProfile(overrides: Partial<VisitorProfile> = {}): VisitorProfile {
  return {
    id: 'visitor-1',
    visitorKey: 'key-1',
    visitorType: 'cookie',
    sourceApp: 'test',
    tenantId: null,
    facts: [],
    lastConversationSummary: '',
    visitCount: 1,
    totalMessages: 0,
    geoRegion: null,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    ...overrides,
  };
}

function makeMessages(): MessageRecord[] {
  return [
    { id: 'm1', conversationId: 'conv-1', role: 'user', content: 'I need running shoes', createdAt: new Date() },
    { id: 'm2', conversationId: 'conv-1', role: 'assistant', content: 'What size do you wear?', createdAt: new Date() },
    { id: 'm3', conversationId: 'conv-1', role: 'user', content: 'US 10, and I prefer Nike', createdAt: new Date() },
  ];
}

describe('ProfileSummarizer', () => {
  let visitorStore: { getById: ReturnType<typeof vi.fn>; updateProfile: ReturnType<typeof vi.fn>; incrementMessages: ReturnType<typeof vi.fn> };
  let conversationStore: { getMessages: ReturnType<typeof vi.fn> };
  let llmCall: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;
  let summarizer: ProfileSummarizer;

  beforeEach(() => {
    visitorStore = {
      getById: vi.fn(),
      updateProfile: vi.fn(),
      incrementMessages: vi.fn(),
    };
    conversationStore = {
      getMessages: vi.fn(),
    };
    llmCall = vi.fn();
    onError = vi.fn();
    onComplete = vi.fn();

    summarizer = new ProfileSummarizer({
      visitorStore: visitorStore as never,
      conversationStore: conversationStore as never,
      llmCall,
      onError,
      onComplete,
    });
  });

  it('summarizes a conversation and updates profile', async () => {
    visitorStore.getById.mockResolvedValue(makeProfile());
    conversationStore.getMessages.mockResolvedValue(makeMessages());
    llmCall.mockResolvedValue({
      text: JSON.stringify({
        facts: [
          { category: 'context', key: 'shoe_size', value: 'US 10', confidence: 1.0 },
          { category: 'preference', key: 'brand', value: 'Nike', confidence: 0.9 },
          { category: 'interest', key: 'running_shoes', value: 'looking for running shoes', confidence: 0.95 },
        ],
        last_conversation_summary: 'Customer looking for size US 10 Nike running shoes.',
      }),
      tokensUsed: { input: 450, output: 180 },
    });

    await summarizer.summarize('visitor-1', 'conv-1');

    expect(visitorStore.updateProfile).toHaveBeenCalledWith(
      'visitor-1',
      expect.arrayContaining([
        expect.objectContaining({ key: 'shoe_size', value: 'US 10' }),
        expect.objectContaining({ key: 'brand', value: 'Nike' }),
      ]),
      'Customer looking for size US 10 Nike running shoes.'
    );
    expect(visitorStore.incrementMessages).toHaveBeenCalledWith('visitor-1', 3);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('skips summarization for unknown visitor', async () => {
    visitorStore.getById.mockResolvedValue(null);

    await summarizer.summarize('nonexistent', 'conv-1');

    expect(llmCall).not.toHaveBeenCalled();
    expect(visitorStore.updateProfile).not.toHaveBeenCalled();
  });

  it('skips summarization for empty conversation', async () => {
    visitorStore.getById.mockResolvedValue(makeProfile());
    conversationStore.getMessages.mockResolvedValue([]);

    await summarizer.summarize('visitor-1', 'conv-1');

    expect(llmCall).not.toHaveBeenCalled();
  });

  it('calls onError when LLM fails', async () => {
    visitorStore.getById.mockResolvedValue(makeProfile());
    conversationStore.getMessages.mockResolvedValue(makeMessages());
    llmCall.mockRejectedValue(new Error('LLM timeout'));

    await summarizer.summarize('visitor-1', 'conv-1');

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'LLM timeout' }),
      'visitor-1'
    );
    expect(visitorStore.updateProfile).not.toHaveBeenCalled();
  });

  it('calls onError when LLM returns invalid JSON', async () => {
    visitorStore.getById.mockResolvedValue(makeProfile());
    conversationStore.getMessages.mockResolvedValue(makeMessages());
    llmCall.mockResolvedValue({
      text: 'not valid json at all',
      tokensUsed: { input: 100, output: 50 },
    });

    await summarizer.summarize('visitor-1', 'conv-1');

    expect(onError).toHaveBeenCalledOnce();
    expect(visitorStore.updateProfile).not.toHaveBeenCalled();
  });

  it('handles markdown-fenced JSON response', async () => {
    visitorStore.getById.mockResolvedValue(makeProfile());
    conversationStore.getMessages.mockResolvedValue(makeMessages());
    llmCall.mockResolvedValue({
      text: '```json\n{"facts":[{"category":"context","key":"test","value":"val","confidence":1.0}],"last_conversation_summary":"test"}\n```',
      tokensUsed: { input: 200, output: 100 },
    });

    await summarizer.summarize('visitor-1', 'conv-1');

    expect(visitorStore.updateProfile).toHaveBeenCalledWith(
      'visitor-1',
      [expect.objectContaining({ key: 'test', value: 'val' })],
      'test'
    );
  });

  it('builds transcript from messages', async () => {
    visitorStore.getById.mockResolvedValue(makeProfile());
    conversationStore.getMessages.mockResolvedValue(makeMessages());
    llmCall.mockResolvedValue({
      text: '{"facts":[],"last_conversation_summary":"empty"}',
      tokensUsed: { input: 100, output: 50 },
    });

    await summarizer.summarize('visitor-1', 'conv-1');

    const prompt = llmCall.mock.calls[0][0] as string;
    expect(prompt).toContain('user: I need running shoes');
    expect(prompt).toContain('assistant: What size do you wear?');
    expect(prompt).toContain('user: US 10, and I prefer Nike');
  });
});
