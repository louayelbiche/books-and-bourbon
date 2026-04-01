/**
 * SSE Writer Extension Tests
 *
 * Tests for the new writer methods: cards, actions, panelPush, panelUpdate.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeCards,
  encodeActions,
  encodePanelPush,
  encodePanelUpdate,
} from '../../pidgie-core/src/streaming/sse.js';

function decodeSSE(data: Uint8Array): any {
  const text = new TextDecoder().decode(data);
  const json = text.replace('data: ', '').replace('\n\n', '');
  return JSON.parse(json);
}

describe('SSE writer extensions', () => {
  describe('encodeCards', () => {
    it('encodes cards event with immediate mode', () => {
      const cards = [
        {
          type: 'brand-profile',
          id: 'card-1',
          data: { companyName: 'Acme' },
          source: { table: 'BrandProfile', recordId: 'rec-1', tenantId: 't-1', validatedAt: 1000 },
        },
      ];
      const result = decodeSSE(encodeCards(cards, 'immediate'));

      expect(result.type).toBe('cards');
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].type).toBe('brand-profile');
      expect(result.renderMode).toBe('immediate');
    });

    it('defaults to immediate render mode', () => {
      const result = decodeSSE(encodeCards([]));
      expect(result.renderMode).toBe('immediate');
    });

    it('supports progressive render mode', () => {
      const result = decodeSSE(encodeCards([], 'progressive'));
      expect(result.renderMode).toBe('progressive');
    });
  });

  describe('encodeActions', () => {
    it('encodes action pills', () => {
      const pills = [
        { type: 'action' as const, label: 'Draft emails', payload: { action: 'draft' } },
        { type: 'message' as const, label: 'Tell me more', payload: { text: 'Tell me more' } },
      ];
      const result = decodeSSE(encodeActions(pills));

      expect(result.type).toBe('actions');
      expect(result.pills).toHaveLength(2);
      expect(result.pills[0].type).toBe('action');
      expect(result.pills[1].type).toBe('message');
    });
  });

  describe('encodePanelPush', () => {
    it('encodes panel push event', () => {
      const item = {
        id: 'panel-1',
        cardType: 'email-preview',
        title: 'Email to Jane',
        content: { subject: 'Hello', body: 'Hi Jane...' },
        pinned: false,
      };
      const result = decodeSSE(encodePanelPush(item));

      expect(result.type).toBe('panel_push');
      expect(result.item.id).toBe('panel-1');
      expect(result.item.cardType).toBe('email-preview');
      expect(result.item.pinned).toBe(false);
    });
  });

  describe('encodePanelUpdate', () => {
    it('encodes panel update event', () => {
      const result = decodeSSE(encodePanelUpdate('panel-1', { title: 'Updated Title' }));

      expect(result.type).toBe('panel_update');
      expect(result.itemId).toBe('panel-1');
      expect(result.updates.title).toBe('Updated Title');
    });
  });
});
