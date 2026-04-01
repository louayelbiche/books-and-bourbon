/**
 * Tests for stripTextUrls — strips absolute URLs from bot text responses.
 *
 * URLs should only appear inside card JSON, never in raw text.
 */

import { describe, it, expect } from 'vitest';
import { stripTextUrls } from '../src/api/url-policy.js';

describe('stripTextUrls', () => {
  it('strips https:// URL from middle of text', () => {
    const result = stripTextUrls('Check out https://example.com/page for details.');
    expect(result).toBe('Check out for details.');
  });

  it('strips http:// URL', () => {
    const result = stripTextUrls('Visit http://example.com today.');
    expect(result).toBe('Visit today.');
  });

  it('strips www. URL', () => {
    const result = stripTextUrls('Go to www.example.com for more.');
    expect(result).toBe('Go to for more.');
  });

  it('strips multiple URLs from text', () => {
    const result = stripTextUrls('See https://a.com and https://b.com here.');
    expect(result).toBe('See and here.');
  });

  it('does NOT strip relative path (/events/foo)', () => {
    const result = stripTextUrls('Check /events/summer-fest for details.');
    expect(result).toBe('Check /events/summer-fest for details.');
  });

  it('does NOT strip plain text (no domains)', () => {
    const result = stripTextUrls('This is just a normal sentence.');
    expect(result).toBe('This is just a normal sentence.');
  });

  it('cleans up double spaces after stripping', () => {
    const result = stripTextUrls('Before https://example.com after.');
    expect(result).toBe('Before after.');
  });

  it('handles URL-only text — returns empty', () => {
    const result = stripTextUrls('https://example.com');
    expect(result).toBe('');
  });

  it('preserves text surrounding stripped URL', () => {
    const result = stripTextUrls('Hello! Visit https://shop.com/products for our catalog. Thanks!');
    expect(result).toBe('Hello! Visit for our catalog. Thanks!');
  });
});
