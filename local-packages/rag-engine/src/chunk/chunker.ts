/**
 * Chunker splits text content into chunks suitable for embedding.
 * Supports multiple strategies: section, paragraph, fixed.
 */

export type ChunkStrategy = 'section' | 'paragraph' | 'fixed';

export interface ChunkOptions {
  /** Chunking strategy. Default: 'paragraph'. */
  strategy?: ChunkStrategy;

  /** Target token count per chunk. Default: 400. */
  targetTokens?: number;

  /** Minimum token count for a chunk. Default: 50. */
  minTokens?: number;

  /** Maximum token count for a chunk. Default: 600. */
  maxTokens?: number;

  /** Breadcrumb prefix to prepend to each chunk. */
  breadcrumb?: string;

  /** Source identifier attached to each chunk. */
  source?: string;

  /** Number of tokens to overlap between consecutive chunks. Default: 0. */
  overlap?: number;
}

export interface Chunk {
  /** The chunk text content (with breadcrumb prefix if provided). */
  content: string;

  /** Zero-based index within the source document. */
  index: number;

  /** Estimated token count. */
  tokenCount: number;

  /** Section reference if detected. */
  section: string | null;

  /** Section title if detected. */
  title: string | null;

  /** Full breadcrumb path. */
  fullPath: string | null;
}

/**
 * Rough token count estimation.
 * English text averages ~4 characters per token.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks using the specified strategy.
 */
export function chunk(text: string, options: ChunkOptions = {}): Chunk[] {
  const {
    strategy = 'paragraph',
    targetTokens = 400,
    minTokens = 50,
    maxTokens = 600,
    breadcrumb,
    overlap = 0,
  } = options;

  let rawChunks: string[];

  switch (strategy) {
    case 'section':
      rawChunks = splitBySections(text);
      break;
    case 'paragraph':
      rawChunks = splitByParagraphs(text);
      break;
    case 'fixed':
      rawChunks = splitByTokenCount(text, targetTokens);
      break;
    default:
      rawChunks = splitByParagraphs(text);
  }

  // Merge small chunks, split large ones
  const merged = mergeSmallChunks(rawChunks, minTokens, targetTokens);
  const final = splitLargeChunks(merged, maxTokens);

  // Apply overlap: prepend trailing tokens from previous chunk
  if (overlap > 0) {
    const overlapChars = overlap * 4;
    for (let i = 1; i < final.length; i++) {
      const prevText = final[i - 1];
      const tail = prevText.slice(-overlapChars);
      final[i] = tail + ' ' + final[i];
    }
  }

  return final.map((content, index) => {
    const { section, title } = extractSectionInfo(content);
    const fullContent = breadcrumb
      ? `${breadcrumb}\n\n${content}`
      : content;

    return {
      content: fullContent.trim(),
      index,
      tokenCount: estimateTokens(fullContent),
      section,
      title,
      fullPath: breadcrumb ?? null,
    };
  });
}

/**
 * Split by section headings (lines starting with # or "Section", "Article", etc.)
 */
function splitBySections(text: string): string[] {
  const pattern = /^(?=(?:#{1,4}\s|Section\s|Article\s|Part\s|\d+\.\d+\s))/gm;
  const parts = text.split(pattern).filter((p) => p.trim().length > 0);
  return parts.length > 0 ? parts : [text];
}

/**
 * Split by double newlines (paragraph boundaries).
 */
function splitByParagraphs(text: string): string[] {
  const parts = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return parts.length > 0 ? parts : [text];
}

/**
 * Split by approximate token count at sentence boundaries.
 */
function splitByTokenCount(text: string, targetTokens: number): string[] {
  const targetChars = targetTokens * 4;
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length > targetChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Merge consecutive chunks that are too small.
 */
function mergeSmallChunks(chunks: string[], minTokens: number, targetTokens: number): string[] {
  const result: string[] = [];
  let buffer = '';

  for (const c of chunks) {
    const combined = buffer ? `${buffer}\n\n${c}` : c;
    if (estimateTokens(combined) <= targetTokens * 1.2) {
      buffer = combined;
    } else if (estimateTokens(buffer) < minTokens) {
      buffer = combined;
    } else {
      if (buffer) result.push(buffer);
      buffer = c;
    }
  }

  if (buffer) result.push(buffer);
  return result;
}

/**
 * Split chunks that exceed maxTokens at sentence boundaries.
 */
function splitLargeChunks(chunks: string[], maxTokens: number): string[] {
  const result: string[] = [];
  const maxChars = maxTokens * 4;

  for (const c of chunks) {
    if (c.length <= maxChars) {
      result.push(c);
      continue;
    }

    // Split at sentence boundaries
    const parts = splitByTokenCount(c, Math.floor(maxTokens * 0.8));
    result.push(...parts);
  }

  return result;
}

/**
 * Extract section number and title from chunk content.
 * Handles patterns like "Section 162(a). Trade or business expenses"
 * or "## 162(a) Trade or business expenses"
 */
function extractSectionInfo(text: string): { section: string | null; title: string | null } {
  // Pattern: "Section NNN(x). Title" or "## NNN(x) Title"
  const patterns = [
    // [Section 162(a): Trade or business expenses]
    /\[(?:Section|Sec\.?)\s*(\d+[A-Za-z]?(?:\([a-z0-9]+\))*):\s*([^\]]+)\]/i,
    // Section 162(a). Trade or business expenses
    /(?:Section|Sec\.?|IRC\s+(?:Section\s+)?)\s*(\d+[A-Za-z]?(?:\([a-z0-9]+\))*)[.,\s]+([^\n]+)/i,
    // ## 162(a) Trade or business expenses
    /^#{1,4}\s*(?:Section\s+)?(\d+[A-Za-z]?(?:\([a-z0-9]+\))*)[.\s]+([^\n]+)/im,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        section: match[1].trim(),
        title: match[2].trim().replace(/[.]+$/, ''),
      };
    }
  }

  return { section: null, title: null };
}
