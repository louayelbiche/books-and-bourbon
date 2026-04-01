import { describe, it, expect } from 'vitest';
import {
  toCardRenderedEvent,
  toCardDroppedEvent,
  type CardDropLog,
  type CardRenderLog,
} from '../src/validation/index.js';

describe('Card Analytics Events', () => {
  describe('toCardRenderedEvent (EVT-01)', () => {
    it('creates card_rendered event from render log', () => {
      const log: CardRenderLog = {
        event: 'card-rendered',
        cardType: 'product',
        recordId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        source: 'db',
        timestamp: 1708900000000,
      };

      const event = toCardRenderedEvent(log, 'pidgie', 'tenant-123');

      expect(event.event).toBe('card_rendered');
      expect(event.properties.cardType).toBe('product');
      expect(event.properties.agentType).toBe('pidgie');
      expect(event.properties.recordId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(event.properties.tenantId).toBe('tenant-123');
      expect(event.properties.source).toBe('db');
      expect(event.properties.timestamp).toBe(1708900000000);
    });

    it('source is always "db"', () => {
      const log: CardRenderLog = {
        event: 'card-rendered',
        cardType: 'email-preview',
        recordId: 'b1ffcd00-0d1c-4f09-bc7e-7cc0ce491b22',
        source: 'db',
        timestamp: Date.now(),
      };

      const event = toCardRenderedEvent(log, 'campaign', 'tenant-456');
      expect(event.properties.source).toBe('db');
    });
  });

  describe('toCardDroppedEvent (EVT-02)', () => {
    it('creates card_dropped event from drop log', () => {
      const log: CardDropLog = {
        event: 'card-validation-drop',
        cardType: 'product',
        recordId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        reason: 'record_not_found',
        tenantId: 'tenant-123',
        timestamp: 1708900000000,
      };

      const event = toCardDroppedEvent(log, 'pidgie');

      expect(event.event).toBe('card_dropped');
      expect(event.properties.cardType).toBe('product');
      expect(event.properties.agentType).toBe('pidgie');
      expect(event.properties.reason).toBe('record_not_found');
      expect(event.properties.recordId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(event.properties.tenantId).toBe('tenant-123');
    });

    it('includes error message when present', () => {
      const log: CardDropLog = {
        event: 'card-validation-drop',
        cardType: 'service',
        recordId: 'c2aade11-1e2d-4a10-ad8f-8dd1df502c33',
        reason: 'query_failed',
        tenantId: 'tenant-123',
        timestamp: Date.now(),
        error: 'Connection timeout',
      };

      const event = toCardDroppedEvent(log, 'pidgie');

      expect(event.properties.error).toBe('Connection timeout');
    });

    it('handles missing tenantId gracefully', () => {
      const log: CardDropLog = {
        event: 'card-validation-drop',
        cardType: 'product',
        recordId: 'bad-id',
        reason: 'invalid_record_id',
        timestamp: Date.now(),
      };

      const event = toCardDroppedEvent(log, 'pidgie');

      expect(event.properties.tenantId).toBe('');
    });
  });
});
