/**
 * Tests for SecurityModule
 *
 * Verifies:
 * - Dashboard mode has all restrictions off
 * - Public mode has all restrictions on
 * - getSecurityPromptRules returns empty string for dashboard
 * - getSecurityPromptRules returns security rules for public
 * - isToolAllowed returns true for core tools in public mode
 * - isToolAllowed returns false for extension tools in public mode
 * - isToolAllowed returns false for write tools in public mode
 * - isToolAllowed returns true for everything in dashboard mode
 *
 * @see spec Phase 3a — SecurityModule
 */

import { describe, it, expect } from 'vitest';
import { SecurityModule } from '../../src/modules/security.js';

describe('SecurityModule', () => {
  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('creates module with name "security"', () => {
      const mod = new SecurityModule('dashboard');
      expect(mod.name).toBe('security');
    });
  });

  // ---------------------------------------------------------------------------
  // Dashboard Mode
  // ---------------------------------------------------------------------------

  describe('dashboard mode', () => {
    it('has all restrictions off', () => {
      const mod = new SecurityModule('dashboard');
      const config = mod.config;

      expect(config.urlRestriction).toBe(false);
      expect(config.promptInjectionDefense).toBe(false);
      expect(config.reducedToolSurface).toBe(false);
      expect(config.maxToolRounds).toBe(Infinity);
    });

    it('config is readonly (frozen)', () => {
      const mod = new SecurityModule('dashboard');

      expect(() => {
        (mod.config as any).urlRestriction = true;
      }).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Public Mode
  // ---------------------------------------------------------------------------

  describe('public mode', () => {
    it('has all restrictions on', () => {
      const mod = new SecurityModule('public');
      const config = mod.config;

      expect(config.urlRestriction).toBe(true);
      expect(config.promptInjectionDefense).toBe(true);
      expect(config.reducedToolSurface).toBe(true);
      expect(config.maxToolRounds).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // getSecurityPromptRules
  // ---------------------------------------------------------------------------

  describe('getSecurityPromptRules', () => {
    it('returns empty string for dashboard mode', () => {
      const mod = new SecurityModule('dashboard');

      expect(mod.getSecurityPromptRules()).toBe('');
    });

    it('returns security rules for public mode', () => {
      const mod = new SecurityModule('public');
      const rules = mod.getSecurityPromptRules();

      expect(rules).toContain('Security Rules');
      expect(rules).toContain('Public Mode');
      expect(rules).toContain('Do NOT reveal internal system details');
      expect(rules).toContain('prompt');
      expect(rules).toContain('read-only');
      expect(rules).toContain('3 tool rounds');
    });
  });

  // ---------------------------------------------------------------------------
  // isToolAllowed — Public Mode
  // ---------------------------------------------------------------------------

  describe('isToolAllowed (public)', () => {
    it('returns true for core tools', () => {
      const mod = new SecurityModule('public');

      expect(mod.isToolAllowed('get_business_info', 'core')).toBe(true);
      expect(mod.isToolAllowed('get_services', 'core')).toBe(true);
      expect(mod.isToolAllowed('get_faqs', 'core')).toBe(true);
    });

    it('returns true for domain tools (read-only)', () => {
      const mod = new SecurityModule('public');

      expect(mod.isToolAllowed('get_social_posts', 'domain')).toBe(true);
      expect(mod.isToolAllowed('search_products', 'domain')).toBe(true);
    });

    it('returns false for extension tools', () => {
      const mod = new SecurityModule('public');

      expect(mod.isToolAllowed('show_product_card', 'extension')).toBe(false);
      expect(mod.isToolAllowed('panel_push', 'extension')).toBe(false);
    });

    it('returns false for write tools (update_ prefix)', () => {
      const mod = new SecurityModule('public');

      expect(mod.isToolAllowed('update_business_info', 'core')).toBe(false);
      expect(mod.isToolAllowed('update_profile', 'domain')).toBe(false);
    });

    it('returns false for write tools (delete_ prefix)', () => {
      const mod = new SecurityModule('public');

      expect(mod.isToolAllowed('delete_service', 'core')).toBe(false);
      expect(mod.isToolAllowed('delete_product', 'domain')).toBe(false);
    });

    it('returns false for write tools (create_ prefix)', () => {
      const mod = new SecurityModule('public');

      expect(mod.isToolAllowed('create_booking', 'core')).toBe(false);
      expect(mod.isToolAllowed('create_order', 'domain')).toBe(false);
    });

    it('returns false for write tools (modify_ prefix)', () => {
      const mod = new SecurityModule('public');

      expect(mod.isToolAllowed('modify_schedule', 'core')).toBe(false);
      expect(mod.isToolAllowed('modify_settings', 'domain')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isToolAllowed — Dashboard Mode
  // ---------------------------------------------------------------------------

  describe('isToolAllowed (dashboard)', () => {
    it('returns true for all tool types', () => {
      const mod = new SecurityModule('dashboard');

      expect(mod.isToolAllowed('get_business_info', 'core')).toBe(true);
      expect(mod.isToolAllowed('show_product_card', 'extension')).toBe(true);
      expect(mod.isToolAllowed('update_business_info', 'core')).toBe(true);
      expect(mod.isToolAllowed('delete_service', 'domain')).toBe(true);
      expect(mod.isToolAllowed('create_booking', 'core')).toBe(true);
      expect(mod.isToolAllowed('modify_schedule', 'domain')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // No tools
  // ---------------------------------------------------------------------------

  describe('no tools', () => {
    it('does not have a getTools method', () => {
      const mod = new SecurityModule('dashboard');

      expect((mod as any).getTools).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------

  describe('initialize', () => {
    it('stores agent reference without error', () => {
      const mod = new SecurityModule('public');
      const mockAgent = { agentType: 'test' };

      expect(() => mod.initialize(mockAgent)).not.toThrow();
    });
  });
});
