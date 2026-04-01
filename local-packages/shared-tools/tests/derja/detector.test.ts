import { describe, it, expect } from 'vitest';
import { detectDerja } from '../../src/derja/detector.js';

describe('detectDerja', () => {
  // ===========================================================================
  // Tunisian Derja (Arabic script)
  // ===========================================================================

  describe('Tunisian Derja detection (Arabic script)', () => {
    it('detects single Derja marker', () => {
      const result = detectDerja('باش نمشي للدار');
      expect(result.dialect).toBe('tn');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.markers.length).toBeGreaterThanOrEqual(1);
    });

    it('detects multiple Derja markers with high confidence', () => {
      // "I want to go, there is a lot of work now"
      const result = detectDerja('نحب نمشي فما برشا خدمة توا');
      expect(result.dialect).toBe('tn');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.markers.length).toBeGreaterThanOrEqual(3);
    });

    it('detects Derja question words', () => {
      const result = detectDerja('كيفاش نجم نحجز موعد علاش ما عندكمش');
      expect(result.dialect).toBe('tn');
      expect(result.markers).toEqual(
        expect.arrayContaining([
          expect.stringContaining('كيفاش'),
          expect.stringContaining('علاش'),
        ])
      );
    });

    it('detects ما...ش negation pattern', () => {
      const result = detectDerja('ما فهمتش شنوا تحب تقول');
      expect(result.dialect).toBe('tn');
      expect(result.markers).toEqual(
        expect.arrayContaining([expect.stringContaining('ما...ش')])
      );
    });

    it('detects French loanwords in Arabic script', () => {
      const result = detectDerja('نورمال يا صاحبي ميرسي على المساعدة');
      expect(result.dialect).toBe('tn');
      expect(result.markers).toEqual(
        expect.arrayContaining([
          expect.stringContaining('نورمال'),
          expect.stringContaining('ميرسي'),
        ])
      );
    });

    it('detects mixed Derja with demonstratives', () => {
      const result = detectDerja('هاذي الحاجة اللي نحب');
      expect(result.dialect).toBe('tn');
      expect(result.markers).toEqual(
        expect.arrayContaining([
          expect.stringContaining('هاذي'),
          expect.stringContaining('نحب'),
        ])
      );
    });
  });

  // ===========================================================================
  // Modern Standard Arabic
  // ===========================================================================

  describe('MSA detection', () => {
    it('classifies pure MSA as ar', () => {
      // "Welcome to our company. We provide the best services."
      const result = detectDerja('مرحبا بكم في شركتنا. نحن نقدم أفضل الخدمات');
      expect(result.dialect).toBe('ar');
      expect(result.markers).toHaveLength(0);
    });

    it('classifies formal MSA text as ar', () => {
      // "The meeting will be held tomorrow at three o'clock in the afternoon"
      const result = detectDerja('سيتم عقد الاجتماع غدا في الساعة الثالثة بعد الظهر');
      expect(result.dialect).toBe('ar');
    });

    it('classifies Quranic/literary Arabic as ar', () => {
      const result = detectDerja('بسم الله الرحمن الرحيم');
      expect(result.dialect).toBe('ar');
    });
  });

  // ===========================================================================
  // Arabizi (Latin-script Tunisian)
  // ===========================================================================

  describe('Arabizi detection', () => {
    it('detects digit-letter Arabizi patterns', () => {
      const result = detectDerja('9a3ed fi dar 7ata wa7ed ma ja');
      expect(result.dialect).toBe('tn');
      expect(result.markers).toEqual(
        expect.arrayContaining([expect.stringContaining('arabizi')])
      );
    });

    it('detects known Arabizi words', () => {
      const result = detectDerja('bech nemchi lel khedma barsha tired');
      expect(result.dialect).toBe('tn');
    });

    it('detects mixed Arabizi with French', () => {
      const result = detectDerja('ya5i normal tawa walla le');
      expect(result.dialect).toBe('tn');
    });
  });

  // ===========================================================================
  // Non-Arabic text
  // ===========================================================================

  describe('non-Arabic text', () => {
    it('returns unknown for English text', () => {
      const result = detectDerja('Hello, how can I help you today?');
      expect(result.dialect).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('returns unknown for French text', () => {
      const result = detectDerja('Bonjour, comment puis-je vous aider?');
      expect(result.dialect).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('returns unknown for empty string', () => {
      const result = detectDerja('');
      expect(result.dialect).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('returns unknown for whitespace-only string', () => {
      const result = detectDerja('   ');
      expect(result.dialect).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  // ===========================================================================
  // Confidence scoring
  // ===========================================================================

  describe('confidence scoring', () => {
    it('returns higher confidence for more markers', () => {
      const fewMarkers = detectDerja('باش نمشي');
      const manyMarkers = detectDerja('نحب باش نمشي فما برشا حاجات توا');

      expect(manyMarkers.confidence).toBeGreaterThan(fewMarkers.confidence);
    });

    it('returns confidence between 0 and 1', () => {
      const texts = [
        'باش نمشي',
        'نحب باش فما',
        'Hello world',
        'مرحبا بكم في شركتنا',
      ];

      for (const text of texts) {
        const result = detectDerja(text);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  // ===========================================================================
  // Mixed text
  // ===========================================================================

  describe('mixed text handling', () => {
    it('detects Derja when mixed with some English', () => {
      const result = detectDerja('نحب نعمل booking باش نمشي');
      expect(result.dialect).toBe('tn');
    });

    it('detects Derja when mixed with French words', () => {
      const result = detectDerja('باش نمشي للـ restaurant فما ياسر خدمة');
      expect(result.dialect).toBe('tn');
    });
  });
});
