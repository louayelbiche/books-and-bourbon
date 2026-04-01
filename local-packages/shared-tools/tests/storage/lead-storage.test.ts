import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteLeadStorage } from '../../src/storage/lead-storage.js';
import type { Lead, ExtractedContact, OutreachLogEntry } from '../../src/storage/lead-storage.js';

describe('SQLiteLeadStorage', () => {
  let storage: SQLiteLeadStorage;

  const testLead: Lead = {
    placeId: 'ChIJ_test123',
    name: 'Test Business',
    address: '123 Main St',
    rating: 4.5,
    reviewCount: 100,
    mapsUrl: 'https://maps.google.com/?cid=123',
    types: ['restaurant', 'food'],
    stage: 'discovered',
    discoveredAt: '2026-03-01T00:00:00Z',
  };

  const testContacts: ExtractedContact[] = [
    { type: 'email', value: 'info@test.com', source: 'mailto-link', confidence: 'high', isPersonal: false },
    { type: 'phone', value: '555-1234', source: 'tel-link', confidence: 'medium', isPersonal: false },
    { type: 'email', value: 'john@test.com', source: 'regex', confidence: 'medium', isPersonal: true, personName: 'John', personRole: 'Owner' },
  ];

  beforeEach(() => {
    storage = new SQLiteLeadStorage(':memory:');
  });

  afterEach(() => {
    storage.close();
  });

  describe('storeLead + getLead', () => {
    it('stores and retrieves a lead', () => {
      storage.storeLead(testLead);
      const lead = storage.getLead('ChIJ_test123');
      expect(lead).not.toBeNull();
      expect(lead!.name).toBe('Test Business');
      expect(lead!.rating).toBe(4.5);
      expect(lead!.types).toEqual(['restaurant', 'food']);
      expect(lead!.fromCache).toBe(true);
    });

    it('returns null for non-existent lead', () => {
      expect(storage.getLead('nonexistent')).toBeNull();
    });

    it('upserts on duplicate placeId', () => {
      storage.storeLead(testLead);
      storage.storeLead({ ...testLead, name: 'Updated Name' });
      const lead = storage.getLead('ChIJ_test123');
      expect(lead!.name).toBe('Updated Name');
    });
  });

  describe('updateEnrichment', () => {
    it('updates enrichment fields', () => {
      storage.storeLead(testLead);
      storage.updateEnrichment('ChIJ_test123', {
        website: 'https://test.com',
        phone: '555-9999',
        score: 85,
        stage: 'enriched',
      });
      const lead = storage.getLead('ChIJ_test123');
      expect(lead!.website).toBe('https://test.com');
      expect(lead!.phone).toBe('555-9999');
      expect(lead!.score).toBe(85);
      expect(lead!.stage).toBe('enriched');
    });
  });

  describe('storeContacts + getContacts', () => {
    it('stores and retrieves contacts', () => {
      storage.storeLead(testLead);
      storage.storeContacts('ChIJ_test123', testContacts);
      const contacts = storage.getContacts('ChIJ_test123');
      expect(contacts).toHaveLength(3);
      expect(contacts[0].value).toBe('info@test.com');
    });

    it('deduplicates contacts by place+type+value', () => {
      storage.storeLead(testLead);
      storage.storeContacts('ChIJ_test123', testContacts);
      storage.storeContacts('ChIJ_test123', testContacts);
      const contacts = storage.getContacts('ChIJ_test123');
      expect(contacts).toHaveLength(3);
    });

    it('returns empty for lead with no contacts', () => {
      storage.storeLead(testLead);
      expect(storage.getContacts('ChIJ_test123')).toEqual([]);
    });

    it('preserves personal contact details', () => {
      storage.storeLead(testLead);
      storage.storeContacts('ChIJ_test123', testContacts);
      const contacts = storage.getContacts('ChIJ_test123');
      const personal = contacts.find((c) => c.isPersonal);
      expect(personal).toBeDefined();
      expect(personal!.personName).toBe('John');
      expect(personal!.personRole).toBe('Owner');
    });
  });

  describe('logOutreach + wasContacted + getOutreachHistory', () => {
    const testOutreach: OutreachLogEntry = {
      placeId: 'ChIJ_test123',
      to: 'info@test.com',
      subject: 'Hello from Runwell',
      template: 'digital-gap',
      demo: true,
      messageId: 'msg_demo_1',
      sentAt: '2026-03-01T12:00:00Z',
    };

    it('logs outreach and retrieves history', () => {
      storage.storeLead(testLead);
      storage.logOutreach(testOutreach);
      const history = storage.getOutreachHistory('ChIJ_test123');
      expect(history).toHaveLength(1);
      expect(history[0].to).toBe('info@test.com');
    });

    it('wasContacted returns false for demo sends', () => {
      storage.storeLead(testLead);
      storage.logOutreach(testOutreach);
      expect(storage.wasContacted('ChIJ_test123')).toBe(false);
    });

    it('wasContacted returns true for real sends', () => {
      storage.storeLead(testLead);
      storage.logOutreach({ ...testOutreach, demo: false });
      expect(storage.wasContacted('ChIJ_test123')).toBe(true);
    });

    it('returns empty history for unknown lead', () => {
      expect(storage.getOutreachHistory('nonexistent')).toEqual([]);
    });
  });
});
