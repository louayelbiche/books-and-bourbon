import { applyConfidenceGate } from '@runwell/rag-engine';
import type { RetrievalResult } from '@runwell/rag-engine';
import { MemoryIndex, type IndexedChunk } from './memory-index.js';

/**
 * Pre-search integration with LLM query expansion.
 * Bridges vocabulary gap between user queries and source material
 * by expanding queries into domain-specific terms before FTS search.
 *
 * All prompts are configurable per-business. No domain-specific defaults.
 */

export interface PreSearchResult {
  confident: boolean;
  context: string;
  chunks: RetrievalResult[];
}

export interface PreSearchConfig {
  /** Gemini API key for query expansion. */
  apiKey?: string;
  /** Query expansion system prompt. Tells the LLM how to expand queries into domain terms. */
  expansionPrompt?: string;
  /** Query rewrite system prompt for follow-up resolution. */
  rewritePrompt?: string;
  /** Re-ranking system prompt. Tells the LLM how to rank candidate chunks. */
  rerankPrompt?: string;
  /** Confidence gate threshold. Default: 0.3 */
  confidenceThreshold?: number;
  /** Max characters of context to inject. Default: 8000 */
  maxContextChars?: number;
  /** Max source chunks to include. Default: 5 */
  maxSourceChunks?: number;
}

const DEFAULT_EXPANSION_PROMPT = `You are a terminology expander for a knowledge base.
Given a user question, output equivalent domain-specific terms and phrases that would appear in the source material.
Return ONLY a JSON array of 3-8 strings. No explanation.

Example: "return policy" -> ["refund policy", "cancellation terms", "return window", "exchange policy", "money back guarantee"]
Example: "pricing plans" -> ["subscription tiers", "pricing table", "plan comparison", "monthly fee", "annual billing"]`;

const DEFAULT_REWRITE_PROMPT = `You are rewriting a follow-up question into a standalone search query for a knowledge base.

Rules:
- Resolve all pronouns ("it", "that", "they", "this") to their specific referents from the conversation.
- Preserve specific entity names mentioned earlier.
- Include the core topic even if the follow-up only asks about a detail.
- If the question already stands alone, return it unchanged.
- Keep it under 40 words. Return ONLY the rewritten query, nothing else.`;

const DEFAULT_RERANK_PROMPT = `Given a user question and candidate text excerpts, return the indices of the 3 most relevant excerpts that directly answer or define the topic asked about.

Ranking criteria (in priority order):
1. Excerpts that contain actual rules, definitions, amounts, rates, or thresholds.
2. Prefer excerpts with concrete requirements over cross-references or amendment history.
3. Prefer excerpts that match the specific context of the question.

Return ONLY a JSON array of indices like [2, 0, 4]. No explanation.`;

export class PreSearch {
  private index: MemoryIndex;
  private config: PreSearchConfig;

  constructor(index: MemoryIndex, config: PreSearchConfig = {}) {
    this.index = index;
    this.config = config;
  }

  /** Search with LLM query expansion and hybrid retrieval for better recall. */
  async search(query: string, topK = 8, history?: Array<{ role: string; content: string }>): Promise<PreSearchResult> {
    // Step 1: Rewrite + embed in parallel (they are independent)
    const needsRewrite = history && history.length > 0 && this.config.apiKey;
    const needsEmbed = this.index.supportsHybrid && this.config.apiKey;

    const [rewriteResult, embedResult] = await Promise.all([
      needsRewrite
        ? this.rewriteWithContext(query, history!).catch((err) => {
            console.warn('[pre-search] Query rewrite failed, using raw query:', err instanceof Error ? err.message : err);
            return query;
          })
        : Promise.resolve(query),
      needsEmbed
        ? this.embedQuery(query).catch((err) => {
            console.warn('[pre-search] Query embedding failed, using FTS only:', err instanceof Error ? err.message : err);
            return null as number[] | null;
          })
        : Promise.resolve(null as number[] | null),
    ]);

    const searchQuery = rewriteResult;
    const queryEmbedding = embedResult;

    // Step 2: FTS/hybrid search with the rewritten query
    let hits = this.index.supportsHybrid
      ? this.index.hybridSearch(searchQuery, queryEmbedding, topK)
      : this.index.search(searchQuery, topK);

    // Step 3: Query expansion (skip if FTS already returned enough hits)
    if (this.config.apiKey && hits.length < topK) {
      try {
        const expanded = await this.expandQuery(searchQuery);
        if (expanded) {
          // Expanded terms go through FTS only (they're already domain terms)
          const expandedHits = this.index.search(expanded, topK);
          // Merge: direct hits first (hybrid ranked), then expanded hits (fill gaps)
          const seen = new Set<number>();
          const merged = [];
          for (const h of hits) {
            if (!seen.has(h.id)) { seen.add(h.id); merged.push(h); }
          }
          for (const h of expandedHits) {
            if (!seen.has(h.id)) { seen.add(h.id); merged.push(h); }
          }
          hits = merged.slice(0, topK);
        }
      } catch (err) {
        console.warn('[pre-search] Query expansion failed:', err instanceof Error ? err.message : err);
      }
    }

    if (hits.length === 0) {
      return { confident: false, context: '', chunks: [] };
    }

    // LLM re-ranking: pick the most relevant chunks from FTS candidates
    let rankedHits = hits;
    if (this.config.apiKey && hits.length > 3) {
      try {
        rankedHits = await this.rerankChunks(searchQuery, hits);
      } catch (err) {
        console.warn('[pre-search] Re-ranking failed, using FTS order:', err instanceof Error ? err.message : err);
      }
    }

    const results: RetrievalResult[] = rankedHits.map((c) => ({
      chunkId: c.id,
      content: c.content,
      similarity: 1.0,
      source: c.source,
      section: c.section,
      title: c.title,
      fullPath: c.fullPath,
      isLiveData: false,
    }));

    const threshold = this.config.confidenceThreshold ?? 0.3;
    const gated = applyConfidenceGate(results, { threshold });

    // Inject top chunks as XML source tags, capped at max context chars
    const maxChars = this.config.maxContextChars ?? 8000;
    const maxChunks = this.config.maxSourceChunks ?? 5;
    let contextLen = 0;
    const selected: string[] = [];
    for (const c of gated.chunks.slice(0, maxChunks)) {
      const section = c.section || 'Unknown';
      const title = c.title || '';
      const block = `<source section="${section}" title="${title}">\n${c.content}\n</source>`;
      if (contextLen + block.length > maxChars && selected.length > 0) break;
      selected.push(block);
      contextLen += block.length;
    }
    const sections = selected.join('\n\n');

    return {
      confident: gated.confident,
      context: sections,
      chunks: gated.chunks,
    };
  }

  /** Rewrite a follow-up query using conversation context so it stands alone. */
  private async rewriteWithContext(query: string, history: Array<{ role: string; content: string }>): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.config.apiKey!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Take last 6 messages (3 turns) for broader context
    const recent = history.slice(-6);
    const contextLines = recent.map((m) => `${m.role}: ${m.content}`).join('\n');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Conversation:\n${contextLines}\n\nLatest question: ${query}` }] }],
      systemInstruction: this.config.rewritePrompt || DEFAULT_REWRITE_PROMPT,
      generationConfig: { temperature: 0, maxOutputTokens: 80 },
    });

    const rewritten = result.response.text().trim();
    if (rewritten.length > 5 && rewritten.length < 200) {
      console.log(`[pre-search] Rewrite: "${query}" -> "${rewritten}"`);
      return rewritten;
    }
    return query;
  }

  /** Use LLM to re-rank FTS candidates by relevance to the user query. */
  private async rerankChunks(query: string, chunks: IndexedChunk[]): Promise<IndexedChunk[]> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.config.apiKey!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build candidate list with first 150 chars of each chunk
    const candidates = chunks.map((c, i) =>
      `[${i}] Section ${c.section || '?'}: ${c.content.substring(0, 150).replace(/\n/g, ' ')}`,
    ).join('\n');

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Question: ${query}\n\nCandidate excerpts:\n${candidates}` }] }],
      systemInstruction: this.config.rerankPrompt || DEFAULT_RERANK_PROMPT,
      generationConfig: { temperature: 0, maxOutputTokens: 50 },
    });

    const text = result.response.text().trim();
    const indices: number[] = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, ''));
    if (!Array.isArray(indices) || indices.length === 0) return chunks;

    // Build re-ranked list: selected indices first, then remaining
    const reranked: IndexedChunk[] = [];
    const used = new Set<number>();
    for (const idx of indices) {
      if (idx >= 0 && idx < chunks.length && !used.has(idx)) {
        reranked.push(chunks[idx]);
        used.add(idx);
      }
    }
    for (let i = 0; i < chunks.length; i++) {
      if (!used.has(i)) reranked.push(chunks[i]);
    }
    return reranked;
  }

  /** Embed query for vector search using Gemini embedding API. */
  private async embedQuery(query: string): Promise<number[]> {
    const { GeminiEmbeddingProvider } = await import('@runwell/rag-engine');
    const provider = new GeminiEmbeddingProvider({
      apiKey: this.config.apiKey!,
      dimensions: 768,
    });
    return provider.embed(query);
  }

  /** Use LLM to expand user query into domain-specific search terms. */
  private async expandQuery(query: string): Promise<string | null> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.config.apiKey!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: query }] }],
      systemInstruction: this.config.expansionPrompt || DEFAULT_EXPANSION_PROMPT,
      generationConfig: { temperature: 0, maxOutputTokens: 200 },
    });

    const text = result.response.text().trim();
    try {
      // Parse JSON array and join as OR query
      const terms: string[] = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, ''));
      if (Array.isArray(terms) && terms.length > 0) {
        // Combine original query words with expanded terms
        return terms.map((t) => `"${t}"`).join(' OR ');
      }
    } catch {
      // If not valid JSON, use raw text as search query
      if (text.length > 5 && text.length < 200) {
        return text;
      }
    }
    return null;
  }
}
