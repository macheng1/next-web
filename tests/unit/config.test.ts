import { describe, it, expect } from 'vitest';
import { parseServerConfig } from '../../src/lib/config/schema';
describe('environment boundaries', () => {
  it('preserves backend prefix and removes trailing slash', () => {
    expect(parseServerConfig({MEMBER_API_URL:'http://localhost:4000/api/v1/'}).memberApiUrl).toBe('http://localhost:4000/api/v1');
  });
  it('never substitutes the portal backend for members', () => {
    expect(parseServerConfig({API_URL:'http://localhost:3100/api'}).memberApiUrl).toBeUndefined();
  });
  it('requires real site configuration for production without exposing values', () => {
    expect(() => parseServerConfig({DEPLOYMENT_ENV:'production'})).toThrow('NEXT_PUBLIC_SITE_URL');
    expect(() => parseServerConfig({API_URL:'https://user:secret@example.com/api'})).toThrow('API_URL');
  });
  it('requires HTTPS in production and rejects invalid trusted origins', () => {
    expect(() => parseServerConfig({DEPLOYMENT_ENV:'production',NEXT_PUBLIC_SITE_URL:'http://example.com'})).toThrow();
    expect(() => parseServerConfig({TRUSTED_ORIGINS:'https://example.com/path'})).toThrow();
  });
});
