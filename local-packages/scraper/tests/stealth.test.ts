import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock impit before any imports
const mockFetch = vi.fn();
const mockImpit = vi.fn().mockImplementation(() => ({ fetch: mockFetch }));

vi.mock('impit', () => ({
  Impit: mockImpit,
}));

describe('stealth module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPageStealth', () => {
    // Fresh import per test to reset singleton
    let fetchPageStealth: typeof import('../src/stealth.js').fetchPageStealth;

    beforeEach(async () => {
      // Reset the lazy singleton by re-importing
      vi.resetModules();
      vi.mock('impit', () => ({
        Impit: mockImpit,
      }));
      const mod = await import('../src/stealth.js');
      fetchPageStealth = mod.fetchPageStealth;
    });

    it('returns HTML content on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'text/html; charset=utf-8' },
        text: () => Promise.resolve('<html><body>Hello</body></html>'),
      });

      const result = await fetchPageStealth('https://example.com');

      expect(result).toBe('<html><body>Hello</body></html>');
      expect(mockImpit).toHaveBeenCalledWith({ browser: 'chrome', ignoreTlsErrors: false });
    });

    it('returns null on 404 when throwOnError=false', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => 'text/html' },
      });

      const result = await fetchPageStealth('https://example.com/missing');

      expect(result).toBeNull();
    });

    it('throws on 403 regardless of throwOnError', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        headers: { get: () => 'text/html' },
      });

      await expect(
        fetchPageStealth('https://example.com/blocked'),
      ).rejects.toThrow('Access denied (403)');
    });

    it('throws on error when throwOnError=true', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => 'text/html' },
      });

      await expect(
        fetchPageStealth('https://example.com/error', true),
      ).rejects.toThrow('HTTP_500');
    });

    it('skips non-HTML content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/pdf' },
        text: () => Promise.resolve('binary'),
      });

      const result = await fetchPageStealth('https://example.com/doc.pdf');

      expect(result).toBeNull();
    });

    it('returns null on network error when throwOnError=false', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await fetchPageStealth('https://example.com');

      expect(result).toBeNull();
    });

    it('throws on network error when throwOnError=true', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        fetchPageStealth('https://example.com', true),
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('reuses impit singleton across calls', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve('<html></html>'),
      });

      await fetchPageStealth('https://example.com/a');
      await fetchPageStealth('https://example.com/b');

      // Impit constructor called only once
      expect(mockImpit).toHaveBeenCalledTimes(1);
    });
  });
});
