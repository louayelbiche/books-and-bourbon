import { describe, it, expect } from 'vitest';
import { isBlockedUrl, sanitizeUrl, validateExternalUrl } from '../src/ssrf.js';

describe('isBlockedUrl', () => {
  // --- Should block ---

  it('blocks localhost', () => {
    expect(isBlockedUrl('http://localhost')).toBe(true);
    expect(isBlockedUrl('http://localhost:3000')).toBe(true);
    expect(isBlockedUrl('https://localhost/path')).toBe(true);
  });

  it('blocks 127.x.x.x loopback', () => {
    expect(isBlockedUrl('http://127.0.0.1')).toBe(true);
    expect(isBlockedUrl('http://127.0.0.1:8080')).toBe(true);
    expect(isBlockedUrl('http://127.255.255.255')).toBe(true);
  });

  it('blocks 0.0.0.0', () => {
    expect(isBlockedUrl('http://0.0.0.0')).toBe(true);
  });

  it('blocks private class A (10.x.x.x)', () => {
    expect(isBlockedUrl('http://10.0.0.1')).toBe(true);
    expect(isBlockedUrl('http://10.255.255.255')).toBe(true);
  });

  it('blocks private class B (172.16-31.x.x)', () => {
    expect(isBlockedUrl('http://172.16.0.1')).toBe(true);
    expect(isBlockedUrl('http://172.31.255.255')).toBe(true);
  });

  it('allows 172.15.x.x and 172.32.x.x (not private)', () => {
    expect(isBlockedUrl('http://172.15.0.1')).toBe(false);
    expect(isBlockedUrl('http://172.32.0.1')).toBe(false);
  });

  it('blocks private class C (192.168.x.x)', () => {
    expect(isBlockedUrl('http://192.168.0.1')).toBe(true);
    expect(isBlockedUrl('http://192.168.1.100')).toBe(true);
  });

  it('blocks link-local / AWS metadata (169.254.x.x)', () => {
    expect(isBlockedUrl('http://169.254.169.254')).toBe(true);
    expect(isBlockedUrl('http://169.254.0.1')).toBe(true);
  });

  it('blocks broadcast (255.x)', () => {
    expect(isBlockedUrl('http://255.255.255.255')).toBe(true);
  });

  it('blocks IPv6 loopback (::1)', () => {
    expect(isBlockedUrl('http://[::1]')).toBe(true);
  });

  it('blocks IPv6 ULA (fc00::/7)', () => {
    expect(isBlockedUrl('http://[fc00::1]')).toBe(true);
    expect(isBlockedUrl('http://[fd00::1]')).toBe(true);
    expect(isBlockedUrl('http://[fdab::1]')).toBe(true);
  });

  it('blocks IPv6 link-local (fe80::/10)', () => {
    expect(isBlockedUrl('http://[fe80::1]')).toBe(true);
  });

  it('blocks IPv4-mapped IPv6 with private IPs', () => {
    expect(isBlockedUrl('http://[::ffff:10.0.0.1]')).toBe(true);
    expect(isBlockedUrl('http://[::ffff:127.0.0.1]')).toBe(true);
    expect(isBlockedUrl('http://[::ffff:192.168.1.1]')).toBe(true);
    expect(isBlockedUrl('http://[::ffff:172.16.0.1]')).toBe(true);
    expect(isBlockedUrl('http://[::ffff:169.254.169.254]')).toBe(true);
  });

  it('blocks .local hostnames', () => {
    expect(isBlockedUrl('http://myhost.local')).toBe(true);
  });

  it('blocks .internal hostnames', () => {
    expect(isBlockedUrl('http://service.internal')).toBe(true);
  });

  it('blocks .localhost hostnames', () => {
    expect(isBlockedUrl('http://app.localhost')).toBe(true);
  });

  it('blocks .localdomain hostnames', () => {
    expect(isBlockedUrl('http://host.localdomain')).toBe(true);
  });

  it('blocks metadata endpoints', () => {
    expect(isBlockedUrl('http://metadata.google.internal')).toBe(true);
    expect(isBlockedUrl('http://metadata.google.com')).toBe(true);
    expect(isBlockedUrl('http://metadata')).toBe(true);
  });

  it('blocks non-HTTP protocols', () => {
    expect(isBlockedUrl('ftp://example.com')).toBe(true);
    expect(isBlockedUrl('file:///etc/passwd')).toBe(true);
    expect(isBlockedUrl('javascript:alert(1)')).toBe(true);
  });

  it('blocks invalid URLs', () => {
    expect(isBlockedUrl('not-a-url')).toBe(true);
    expect(isBlockedUrl('')).toBe(true);
  });

  // --- Should allow ---

  it('allows public URLs', () => {
    expect(isBlockedUrl('https://example.com')).toBe(false);
    expect(isBlockedUrl('https://google.com')).toBe(false);
    expect(isBlockedUrl('http://1.2.3.4')).toBe(false);
    expect(isBlockedUrl('https://bioinstruments.tn')).toBe(false);
  });

  it('allows IPv4-mapped IPv6 with public IPs', () => {
    expect(isBlockedUrl('http://[::ffff:8.8.8.8]')).toBe(false);
  });
});

describe('sanitizeUrl', () => {
  it('removes credentials from URL', () => {
    expect(sanitizeUrl('http://user:pass@example.com/path')).toBe(
      'http://example.com/path'
    );
  });

  it('returns same URL if no credentials', () => {
    expect(sanitizeUrl('https://example.com/path')).toBe(
      'https://example.com/path'
    );
  });

  it('returns input for invalid URLs', () => {
    expect(sanitizeUrl('not-a-url')).toBe('not-a-url');
  });
});

describe('validateExternalUrl', () => {
  it('returns valid for public URLs', () => {
    const result = validateExternalUrl('https://example.com');
    expect(result.valid).toBe(true);
    expect(result.url).toBe('https://example.com/');
  });

  it('adds https:// if missing', () => {
    const result = validateExternalUrl('example.com');
    expect(result.valid).toBe(true);
    expect(result.url).toContain('https://example.com');
  });

  it('rejects empty URL', () => {
    const result = validateExternalUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL is required');
  });

  it('rejects private URLs', () => {
    const result = validateExternalUrl('http://192.168.1.1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL not allowed');
  });

  it('rejects invalid URLs', () => {
    const result = validateExternalUrl('://broken');
    expect(result.valid).toBe(false);
  });

  it('strips credentials from validated URLs', () => {
    const result = validateExternalUrl('https://user:pass@example.com');
    expect(result.valid).toBe(true);
    expect(result.url).not.toContain('user');
    expect(result.url).not.toContain('pass');
  });
});
