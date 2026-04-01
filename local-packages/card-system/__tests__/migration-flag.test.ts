import { describe, test, expect, vi, afterEach } from 'vitest';
import {
  isCardToolMigrationEnabled,
  toMigrationFallbackEvent,
  MIGRATION_FALLBACK_EVENT,
} from '../src/validation/migration-flag.js';

describe('isCardToolMigrationEnabled', () => {
  afterEach(() => {
    delete process.env.CARD_TOOL_MIGRATION;
  });

  test('returns false when env var is not set', () => {
    delete process.env.CARD_TOOL_MIGRATION;
    expect(isCardToolMigrationEnabled()).toBe(false);
  });

  test('returns false when env var is "false"', () => {
    process.env.CARD_TOOL_MIGRATION = 'false';
    expect(isCardToolMigrationEnabled()).toBe(false);
  });

  test('returns true when env var is "true"', () => {
    process.env.CARD_TOOL_MIGRATION = 'true';
    expect(isCardToolMigrationEnabled()).toBe(true);
  });

  test('returns true when env var is "1"', () => {
    process.env.CARD_TOOL_MIGRATION = '1';
    expect(isCardToolMigrationEnabled()).toBe(true);
  });

  test('returns false for random string', () => {
    process.env.CARD_TOOL_MIGRATION = 'yes';
    expect(isCardToolMigrationEnabled()).toBe(false);
  });
});

describe('toMigrationFallbackEvent', () => {
  test('creates EVT-07 event with flag_off reason', () => {
    const event = toMigrationFallbackEvent('pidgie', 'flag_off');
    expect(event.event).toBe(MIGRATION_FALLBACK_EVENT);
    expect(event.event).toBe('EVT-07');
    expect(event.agentType).toBe('pidgie');
    expect(event.reason).toBe('flag_off');
    expect(event.siteName).toBeUndefined();
    expect(event.timestamp).toBeGreaterThan(0);
  });

  test('creates EVT-07 event with tool_error reason and site name', () => {
    const event = toMigrationFallbackEvent('social', 'tool_error', 'capital-v');
    expect(event.event).toBe('EVT-07');
    expect(event.agentType).toBe('social');
    expect(event.reason).toBe('tool_error');
    expect(event.siteName).toBe('capital-v');
  });
});
