/**
 * Demo Pill Registry Tests
 *
 * Tests for deterministic demo pill selection per agent/phase.
 */

import { describe, it, expect } from 'vitest';
import { getDemoPills, getAgentPhases } from '../src/validation/demo-pills.js';

describe('getDemoPills', () => {
  it('returns pills for campaign brand-analysis phase', () => {
    const pills = getDemoPills('campaign', 'brand-analysis');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0].type).toBe('action');
    expect(pills[0].label).toBe('Analyze my brand');
  });

  it('returns pills for engagement persona-selection phase', () => {
    const pills = getDemoPills('engagement', 'persona-selection');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0].type).toBe('action');
  });

  it('returns pills for social content-generation phase', () => {
    const pills = getDemoPills('social', 'content-generation');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills.some((p) => p.type === 'action')).toBe(true);
  });

  it('returns message-only pills for pidgie greeting phase', () => {
    const pills = getDemoPills('pidgie', 'greeting');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills.every((p) => p.type === 'message')).toBe(true);
  });

  it('returns empty array for unknown phase', () => {
    const pills = getDemoPills('campaign', 'nonexistent-phase');
    expect(pills).toEqual([]);
  });

  it('returns empty array for unknown agent', () => {
    const pills = getDemoPills('unknown-agent' as any, 'brand-analysis');
    expect(pills).toEqual([]);
  });

  it('produces deterministic results (same pills every call)', () => {
    const first = getDemoPills('campaign', 'brand-analysis');
    const second = getDemoPills('campaign', 'brand-analysis');
    expect(first).toEqual(second);
  });
});

describe('getAgentPhases', () => {
  it('returns phase names for campaign agent', () => {
    const phases = getAgentPhases('campaign');
    expect(phases).toContain('brand-analysis');
    expect(phases).toContain('review');
  });

  it('returns phase names for engagement agent', () => {
    const phases = getAgentPhases('engagement');
    expect(phases).toContain('persona-selection');
    expect(phases).toContain('content-generation');
  });

  it('returns phase names for social agent', () => {
    const phases = getAgentPhases('social');
    expect(phases).toContain('brand-analysis');
    expect(phases).toContain('review');
  });

  it('returns phase names for pidgie', () => {
    const phases = getAgentPhases('pidgie');
    expect(phases).toContain('greeting');
    expect(phases).toContain('exploration');
  });

  it('returns empty array for unknown agent', () => {
    const phases = getAgentPhases('unknown' as any);
    expect(phases).toEqual([]);
  });
});
