import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiEmbeddingProvider } from '../../src/providers/gemini-embedding.js';

// Mock the @google/generative-ai module
const mockEmbedContent = vi.fn();
const mockBatchEmbedContents = vi.fn();

const mockGetGenerativeModel = vi.fn().mockReturnValue({
  embedContent: mockEmbedContent,
  batchEmbedContents: mockBatchEmbedContents,
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

function makeVector(dims: number = 768): number[] {
  return Array.from({ length: dims }, () => Math.random());
}

describe('GeminiEmbeddingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbedContent.mockReset();
    mockBatchEmbedContents.mockReset();
  });

  it('requires an API key', () => {
    expect(() => new GeminiEmbeddingProvider({ apiKey: '' })).toThrow(
      'apiKey is required'
    );
  });

  it('has 3072 dimensions by default', () => {
    const provider = new GeminiEmbeddingProvider({ apiKey: 'test-key' });
    expect(provider.dimensions).toBe(3072);
  });

  it('embeds a single text', async () => {
    const vector = makeVector();
    mockEmbedContent.mockResolvedValue({
      embedding: { values: vector },
    });

    const provider = new GeminiEmbeddingProvider({ apiKey: 'test-key' });
    const result = await provider.embed('Hello world');

    expect(result).toEqual(vector);
    expect(result).toHaveLength(768);
    expect(mockEmbedContent).toHaveBeenCalledWith('Hello world');
  });

  it('embeds a batch of texts', async () => {
    const vectors = [makeVector(), makeVector(), makeVector()];
    mockBatchEmbedContents.mockResolvedValue({
      embeddings: vectors.map((v) => ({ values: v })),
    });

    const provider = new GeminiEmbeddingProvider({ apiKey: 'test-key' });
    const result = await provider.embedBatch(['text 1', 'text 2', 'text 3']);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(vectors[0]);
    expect(result[1]).toEqual(vectors[1]);
    expect(result[2]).toEqual(vectors[2]);
  });

  it('returns empty array for empty batch', async () => {
    const provider = new GeminiEmbeddingProvider({ apiKey: 'test-key' });
    const result = await provider.embedBatch([]);
    expect(result).toEqual([]);
    expect(mockBatchEmbedContents).not.toHaveBeenCalled();
  });

  it('splits large batches into chunks', async () => {
    // Use batchSize of 2 so 5 texts require 3 API calls
    const vectors = Array.from({ length: 5 }, () => makeVector());

    mockBatchEmbedContents
      .mockResolvedValueOnce({
        embeddings: [{ values: vectors[0] }, { values: vectors[1] }],
      })
      .mockResolvedValueOnce({
        embeddings: [{ values: vectors[2] }, { values: vectors[3] }],
      })
      .mockResolvedValueOnce({
        embeddings: [{ values: vectors[4] }],
      });

    const provider = new GeminiEmbeddingProvider({
      apiKey: 'test-key',
      batchSize: 2,
    });
    const result = await provider.embedBatch([
      'a', 'b', 'c', 'd', 'e',
    ]);

    expect(result).toHaveLength(5);
    expect(mockBatchEmbedContents).toHaveBeenCalledTimes(3);
  });

  it('retries on 429 rate limit', async () => {
    const vector = makeVector();
    const rateLimitError = Object.assign(new Error('Rate limited'), {
      status: 429,
    });

    mockEmbedContent
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ embedding: { values: vector } });

    const provider = new GeminiEmbeddingProvider({
      apiKey: 'test-key',
      maxRetries: 2,
    });

    const result = await provider.embed('test');
    expect(result).toEqual(vector);
    expect(mockEmbedContent).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 server error', async () => {
    const vector = makeVector();
    const serverError = Object.assign(new Error('Internal server error'), {
      status: 500,
    });

    mockEmbedContent
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({ embedding: { values: vector } });

    const provider = new GeminiEmbeddingProvider({
      apiKey: 'test-key',
      maxRetries: 2,
    });

    const result = await provider.embed('test');
    expect(result).toEqual(vector);
  });

  it('throws enhanced error on auth failure (401)', async () => {
    const authError = Object.assign(new Error('Unauthorized'), {
      status: 401,
    });
    mockEmbedContent.mockRejectedValue(authError);

    const provider = new GeminiEmbeddingProvider({ apiKey: 'bad-key' });
    await expect(provider.embed('test')).rejects.toThrow('auth failed');
  });

  it('throws enhanced error on quota exceeded (429) after max retries', async () => {
    const rateLimitError = Object.assign(new Error('Too many requests'), {
      status: 429,
    });
    mockEmbedContent.mockRejectedValue(rateLimitError);

    const provider = new GeminiEmbeddingProvider({
      apiKey: 'test-key',
      maxRetries: 1,
    });

    await expect(provider.embed('test')).rejects.toThrow('rate limited');
  });

  it('does not retry on 400 client errors', async () => {
    const clientError = Object.assign(new Error('Bad request'), {
      status: 400,
    });
    mockEmbedContent.mockRejectedValue(clientError);

    const provider = new GeminiEmbeddingProvider({ apiKey: 'test-key' });
    await expect(provider.embed('test')).rejects.toThrow('Bad request');
    expect(mockEmbedContent).toHaveBeenCalledTimes(1);
  });

  it('uses custom model when specified', async () => {
    const vector = makeVector();
    mockEmbedContent.mockResolvedValue({
      embedding: { values: vector },
    });

    const provider = new GeminiEmbeddingProvider({
      apiKey: 'test-key',
      model: 'text-embedding-005',
    });
    await provider.embed('test');

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'text-embedding-005',
    });
  });

  it('formats batch requests with correct structure', async () => {
    mockBatchEmbedContents.mockResolvedValue({
      embeddings: [{ values: makeVector() }],
    });

    const provider = new GeminiEmbeddingProvider({ apiKey: 'test-key' });
    await provider.embedBatch(['test text']);

    expect(mockBatchEmbedContents).toHaveBeenCalledWith({
      requests: [
        {
          content: { role: 'user', parts: [{ text: 'test text' }] },
        },
      ],
    });
  });
});
