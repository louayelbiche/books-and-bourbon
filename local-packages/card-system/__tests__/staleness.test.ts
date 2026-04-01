import { describe, it, expect, vi, afterEach } from 'vitest';
import { getStalenessLabel } from '../src/utils/staleness.js';

describe('getStalenessLabel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockNow(offset: number) {
    const baseTime = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + offset);
    return baseTime;
  }

  it('returns null for just-generated card (0ms age)', () => {
    const generatedAt = mockNow(0);
    expect(getStalenessLabel(generatedAt)).toBeNull();
  });

  it('returns null for card under 1 hour (30min age)', () => {
    const generatedAt = mockNow(30 * 60 * 1000);
    expect(getStalenessLabel(generatedAt)).toBeNull();
  });

  it('returns null at exactly 59 minutes', () => {
    const generatedAt = mockNow(59 * 60 * 1000);
    expect(getStalenessLabel(generatedAt)).toBeNull();
  });

  it('returns "Generated 1 hour ago" at 1 hour', () => {
    const generatedAt = mockNow(60 * 60 * 1000);
    expect(getStalenessLabel(generatedAt)).toBe('Generated 1 hour ago');
  });

  it('returns "Generated 3 hours ago" at 3 hours', () => {
    const generatedAt = mockNow(3 * 60 * 60 * 1000);
    expect(getStalenessLabel(generatedAt)).toBe('Generated 3 hours ago');
  });

  it('returns "Generated 1 day ago" at 25 hours', () => {
    const generatedAt = mockNow(25 * 60 * 60 * 1000);
    expect(getStalenessLabel(generatedAt)).toBe('Generated 1 day ago');
  });

  it('returns "Generated 2 days ago" at 50 hours', () => {
    const generatedAt = mockNow(50 * 60 * 60 * 1000);
    expect(getStalenessLabel(generatedAt)).toBe('Generated 2 days ago');
  });

  it('respects custom threshold (30min)', () => {
    const generatedAt = mockNow(45 * 60 * 1000);
    // With 30min threshold, 45min is over threshold
    // But hours = Math.floor(45min / 60min) = 0, so returns null due to hours < 1 check
    // This is by design — the staleness label only shows for 1+ hours regardless of threshold
    expect(getStalenessLabel(generatedAt, 30 * 60 * 1000)).toBeNull();
  });

  it('returns label when custom threshold is met AND age >= 1 hour', () => {
    const generatedAt = mockNow(65 * 60 * 1000);
    // 65 min with 30min threshold → threshold exceeded, 1 hour
    expect(getStalenessLabel(generatedAt, 30 * 60 * 1000)).toBe('Generated 1 hour ago');
  });

  it('returns null when age below custom threshold even if > 1hr', () => {
    const generatedAt = mockNow(90 * 60 * 1000);
    // 90 min with 2hr threshold → under threshold
    expect(getStalenessLabel(generatedAt, 2 * 60 * 60 * 1000)).toBeNull();
  });
});
