// Provider interfaces are re-exported from the main entry point.
// This sub-path export exists for consumers who only need the interfaces
// without importing the full engine.
export type {
  EmbeddingProvider,
  OCRProvider,
  LiveDataAdapter,
  LiveDataResult,
} from '../types/providers.js';

// Concrete provider implementations
export { GeminiEmbeddingProvider } from './gemini-embedding.js';
export type { GeminiEmbeddingConfig } from './gemini-embedding.js';

export { PdfExtractor, createPdfExtractor } from './pdf-extractor.js';
