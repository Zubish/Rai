import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleConnection, requireOrigin, sessionCookie } from './connection-http.mjs';

afterEach(() => vi.unstubAllEnvs());

describe('connection HTTP boundary', () => {
  it('requires the configured origin for browser mutations', () => {
    vi.stubEnv('RAI_APP_ORIGIN', 'https://rai.example');
    expect(() => requireOrigin({ headers: { origin: 'https://rai.example' } })).not.toThrow();
    for (const origin of [undefined, 'null', 'https://attacker.example', 'https://rai.example.attacker.example']) {
      expect(() => requireOrigin({ headers: { origin } })).toThrow('Same-origin request required');
    }
  });
  it('reads only the exact host-session cookie', () => {
    expect(sessionCookie({ headers: { cookie: 'other=abc; __Host-rai-session=correct; suffix__Host-rai-session=wrong' } })).toBe('correct');
    expect(sessionCookie({ headers: { cookie: 'suffix__Host-rai-session=wrong' } })).toBe('');
    expect(sessionCookie({ headers: {} })).toBe('');
  });
  it('fails closed when disabled and never caches the response', async () => {
    vi.stubEnv('RAI_CONNECTION_ENABLED', 'false');
    const response = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() };
    response.status.mockReturnValue(response);
    await handleConnection({ method: 'GET', headers: {} }, response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.json).toHaveBeenCalledWith({ error: { code: 'connection_failed', message: expect.not.stringContaining('postgres') } });
  });
});
