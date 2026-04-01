import type { RetrievalResult, GroundedContext } from '../types/engine.js';

export interface ConfidenceGateOptions {
  /** Minimum similarity for a chunk to pass. Default: 0.75. */
  threshold?: number;
}

/**
 * Apply the confidence gate to retrieval results.
 * Filters chunks below the threshold and builds a GroundedContext
 * ready for injection into an LLM prompt.
 */
export function applyConfidenceGate(
  results: RetrievalResult[],
  options: ConfidenceGateOptions = {}
): GroundedContext {
  const { threshold = 0.75 } = options;

  // Separate static chunks from live data
  const staticResults = results.filter((r) => !r.isLiveData);
  const liveResults = results.filter((r) => r.isLiveData);

  // Filter static results by threshold
  const passed = staticResults.filter((r) => {
    // FTS-only results (no similarity score) pass through if there are also
    // vector results that passed. On their own, they don't count as "confident."
    if (r.similarity === null) return true;
    return r.similarity >= threshold;
  });

  // If only FTS results remain (no vector results passed), not confident
  const hasVectorResults = passed.some((r) => r.similarity !== null && r.similarity >= threshold);
  const confident = hasVectorResults || liveResults.length > 0;

  // If not confident, return empty context
  if (!confident) {
    return {
      confident: false,
      chunks: [],
      availableSections: [],
      contextText: '',
      liveData: liveResults.map((r) => r.liveData!),
    };
  }

  // Build available sections list
  const availableSections = passed
    .map((r) => r.section)
    .filter((s): s is string => s !== null);

  // Build formatted context text
  const contextParts: string[] = [];

  for (const r of passed) {
    if (r.similarity === null && !hasVectorResults) continue;
    let header = '';
    if (r.section) {
      header = r.title
        ? `[Section ${r.section}: ${r.title}]`
        : `[Section ${r.section}]`;
    }
    contextParts.push(header ? `${header}\n${r.content}` : r.content);
  }

  // Append live data summaries
  for (const r of liveResults) {
    if (r.liveData) {
      contextParts.push(`[Live Data: ${r.title ?? r.source}]\n${r.liveData.summary}`);
    }
  }

  return {
    confident: true,
    chunks: passed,
    availableSections: [...new Set(availableSections)],
    contextText: contextParts.join('\n\n---\n\n'),
    liveData: liveResults.map((r) => r.liveData!).filter(Boolean),
  };
}
