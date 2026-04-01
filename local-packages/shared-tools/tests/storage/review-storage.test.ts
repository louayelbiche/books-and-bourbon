import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteReviewStorage } from '../../src/storage/review-storage.js';
import type { Review, ReviewSentiment } from '../../src/storage/review-storage.js';

describe('SQLiteReviewStorage', () => {
  let storage: SQLiteReviewStorage;

  const testReviews: Review[] = [
    {
      reviewId: 'rev_001',
      platform: 'google',
      author: 'Alice',
      rating: 5,
      text: 'Amazing food and great service!',
      publishedAt: '2026-02-15T10:00:00Z',
      hasOwnerResponse: true,
      ownerResponse: 'Thank you Alice!',
    },
    {
      reviewId: 'rev_002',
      platform: 'google',
      author: 'Bob',
      rating: 2,
      text: 'Long wait times and cold food.',
      publishedAt: '2026-02-20T14:00:00Z',
      hasOwnerResponse: false,
    },
    {
      reviewId: 'rev_003',
      platform: 'tripadvisor',
      author: 'Charlie',
      rating: 4,
      text: 'Good atmosphere, decent menu.',
      publishedAt: '2026-02-22T08:00:00Z',
      hasOwnerResponse: false,
    },
  ];

  const testSentiment: ReviewSentiment = {
    reviewId: 'rev_001',
    overall: 'positive',
    score: 5,
    aspects: [
      { name: 'food', sentiment: 'positive', score: 5, mentionCount: 1, topQuote: 'Amazing food' },
      { name: 'service', sentiment: 'positive', score: 5, mentionCount: 1, topQuote: 'great service' },
    ],
    analyzer: 'gemini',
  };

  beforeEach(() => {
    storage = new SQLiteReviewStorage(':memory:');
  });

  afterEach(() => {
    storage.close();
  });

  describe('storeReviews + getReviews', () => {
    it('stores and retrieves reviews', () => {
      storage.storeReviews('biz_001', testReviews, 'google-places-api');
      const reviews = storage.getReviews('biz_001');
      expect(reviews).toHaveLength(3);
    });

    it('filters by platform', () => {
      storage.storeReviews('biz_001', testReviews, 'google-places-api');
      const googleOnly = storage.getReviews('biz_001', 'google');
      expect(googleOnly).toHaveLength(2);
    });

    it('deduplicates by reviewId + platform', () => {
      storage.storeReviews('biz_001', testReviews, 'google-places-api');
      storage.storeReviews('biz_001', testReviews, 'google-places-api');
      expect(storage.getReviews('biz_001')).toHaveLength(3);
    });

    it('preserves owner response', () => {
      storage.storeReviews('biz_001', testReviews, 'google-places-api');
      const reviews = storage.getReviews('biz_001');
      const alice = reviews.find((r) => r.author === 'Alice');
      expect(alice!.hasOwnerResponse).toBe(true);
      expect(alice!.ownerResponse).toBe('Thank you Alice!');
    });

    it('returns empty for unknown business', () => {
      expect(storage.getReviews('nonexistent')).toEqual([]);
    });
  });

  describe('storeSentiment + getSentiment', () => {
    it('stores and retrieves sentiment', () => {
      storage.storeSentiment(testSentiment);
      const result = storage.getSentiment('rev_001');
      expect(result).not.toBeNull();
      expect(result!.overall).toBe('positive');
      expect(result!.score).toBe(5);
      expect(result!.aspects).toHaveLength(2);
      expect(result!.analyzer).toBe('gemini');
    });

    it('returns null for unknown review', () => {
      expect(storage.getSentiment('nonexistent')).toBeNull();
    });
  });

  describe('getUnanalyzedReviews', () => {
    it('returns reviews without sentiment', () => {
      storage.storeReviews('biz_001', testReviews, 'google-places-api');
      storage.storeSentiment(testSentiment); // Only rev_001 analyzed
      const unanalyzed = storage.getUnanalyzedReviews('biz_001');
      expect(unanalyzed).toHaveLength(2);
      expect(unanalyzed.map((r) => r.reviewId)).toContain('rev_002');
      expect(unanalyzed.map((r) => r.reviewId)).toContain('rev_003');
    });

    it('returns all reviews when none analyzed', () => {
      storage.storeReviews('biz_001', testReviews, 'google-places-api');
      expect(storage.getUnanalyzedReviews('biz_001')).toHaveLength(3);
    });
  });

  describe('logScan + getLastScanTime', () => {
    it('logs scan and retrieves last scan time', () => {
      storage.logScan('biz_001', 'google-places-api', 4.5, 100);
      const lastScan = storage.getLastScanTime('biz_001');
      expect(lastScan).toBeTruthy();
    });

    it('returns null for never-scanned business', () => {
      expect(storage.getLastScanTime('nonexistent')).toBeNull();
    });
  });

  describe('getRatingHistory', () => {
    it('returns rating history in descending order', () => {
      storage.logScan('biz_001', 'google', 4.2, 90);
      storage.logScan('biz_001', 'google', 4.3, 95);
      storage.logScan('biz_001', 'google', 4.5, 100);

      const history = storage.getRatingHistory('biz_001');
      expect(history).toHaveLength(3);
      expect(history[0].rating).toBe(4.5);
      expect(history[0].reviewCount).toBe(100);
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        storage.logScan('biz_001', 'google', 4.0 + i * 0.1, 80 + i);
      }
      const history = storage.getRatingHistory('biz_001', 5);
      expect(history).toHaveLength(5);
    });
  });

  describe('getCachedReviewCount', () => {
    it('returns correct count', () => {
      storage.storeReviews('biz_001', testReviews, 'google-places-api');
      expect(storage.getCachedReviewCount('biz_001')).toBe(3);
    });

    it('returns 0 for unknown business', () => {
      expect(storage.getCachedReviewCount('nonexistent')).toBe(0);
    });
  });
});
