/**
 * PDF Text Extractor
 *
 * OCRProvider implementation that extracts text from PDF files using pdf-parse.
 * Falls back to empty string for unsupported file types.
 */

import type { OCRProvider } from '../types/providers.js';

/**
 * PDF text extraction provider.
 * Uses pdf-parse for text extraction from PDF buffers.
 * Does not require Tesseract or any external OCR service.
 */
export class PdfExtractor implements OCRProvider {
  async extract(file: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      return this.extractPdf(file);
    }

    // For images, we would need a separate OCR service
    // For now, return empty string and log a warning
    console.warn(`[PdfExtractor] Unsupported MIME type: ${mimeType}. Only application/pdf is supported.`);
    return '';
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import to avoid hard dependency
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);

      // Clean up extracted text: normalize whitespace, remove excessive newlines
      let text = data.text || '';
      text = text.replace(/\r\n/g, '\n');
      text = text.replace(/\n{3,}/g, '\n\n');
      text = text.trim();

      return text;
    } catch (err) {
      console.error('[PdfExtractor] Failed to parse PDF:', err instanceof Error ? err.message : err);
      return '';
    }
  }
}

/**
 * Create a PdfExtractor instance.
 */
export function createPdfExtractor(): PdfExtractor {
  return new PdfExtractor();
}
