import { describe, expect, it, vi } from 'vitest';
import { createConnectionSessions, digest } from './connection-session.mjs';

function fixture() {
  const records = new Map<string, { payload: string; expires: number }>();
  let time = Date.now();
  const store = {
    async save(kind: string, key: string, payload: string, expires: number) { records.set(`${kind}:${key}`, { payload, expires }); },
    async get(kind: string, key: string, now: number) { const record = records.get(`${kind}:${key}`); return record && record.expires > now ? record.payload : undefined; },
    async take(kind: string, key: string, now: number) { const value = await this.get(kind, key, now); records.delete(`${kind}:${key}`); return value; },
    async update(kind: string, key: string, transform: (value: string) => string) { const record = records.get(`${kind}:${key}`)!; record.payload = transform(record.payload); }
  };
  const grant = 'a'.repeat(43);
  const scope = { tenantId: 'totalenergies', userId: 'owner', role: 'admin', branchIds: ['lagos', 'abuja'], capabilities: ['inventory_analytics'] };
  const upstream = { exchange: vi.fn().mockResolvedValue({ accessToken: grant, expiresIn: 900 }), inspect: vi.fn().mockResolvedValue(scope), revoke: vi.fn().mockResolvedValue({ revoked: true }) };
  const sessions = createConnectionSessions({ store, upstream, origin: 'https://rai.example', rxOrigin: 'https://rxledger.example', encryptionKey: Buffer.alloc(32, 1).toString('base64'), now: () => time });
  async function start() { const result = await sessions.start('totalenergies'); return { ...result, state: new URL(result.url).searchParams.get('state')! }; }
  async function login() { const result = await start(); return sessions.callback({ browserToken: result.browserToken, state: result.state, code: 'c'.repeat(43) }); }
  return { records, sessions, upstream, grant, scope, start, login, advance() { time += 1_000_000; } };
}

describe('RxLedger browser connection', () => {
  it('stores encrypted secrets and uses only hashed browser tokens', async () => {
    const app = fixture(), start = await app.start();
    expect(app.records.has(`login:${digest(start.browserToken)}`)).toBe(true);
    expect(JSON.stringify([...app.records])).not.toContain(start.state);
    const session = await app.sessions.callback({ browserToken: start.browserToken, state: start.state, code: 'c'.repeat(43) });
    expect(JSON.stringify([...app.records])).not.toContain(app.grant);
    expect(await app.sessions.context(session.sessionToken)).toMatchObject({ tenantId: 'totalenergies', branchId: 'lagos', delegatedToken: app.grant });
  });
  it('rejects wrong state, missing browser binding and callback replay', async () => {
    const app = fixture(), start = await app.start();
    await expect(app.sessions.callback({ browserToken: 'wrong', state: start.state, code: 'c'.repeat(43) })).rejects.toMatchObject({ status: 401 });
    await expect(app.sessions.callback({ browserToken: start.browserToken, state: 'x'.repeat(43), code: 'c'.repeat(43) })).rejects.toMatchObject({ status: 401 });
    expect(app.upstream.exchange).not.toHaveBeenCalled();
    const next = await app.start();
    await app.sessions.callback({ browserToken: next.browserToken, state: next.state, code: 'c'.repeat(43) });
    await expect(app.sessions.callback({ browserToken: next.browserToken, state: next.state, code: 'c'.repeat(43) })).rejects.toMatchObject({ status: 401 });
    expect(app.upstream.exchange).toHaveBeenCalledTimes(1);
  });
  it('denial and expiration never exchange an authorization code', async () => {
    const app = fixture(), start = await app.start();
    expect(await app.sessions.callback({ browserToken: start.browserToken, state: start.state, denied: true })).toEqual({ denied: true });
    const next = await app.start(); app.advance();
    await expect(app.sessions.callback({ browserToken: next.browserToken, state: next.state, code: 'c'.repeat(43) })).rejects.toMatchObject({ status: 401 });
    expect(app.upstream.exchange).not.toHaveBeenCalled();
  });
  it('rechecks scope and blocks forbidden branches, logout and upstream outage', async () => {
    const app = fixture(), session = await app.login();
    await expect(app.sessions.selectBranch(session.sessionToken, 'other')).rejects.toMatchObject({ status: 403 });
    await app.sessions.selectBranch(session.sessionToken, 'abuja');
    expect((await app.sessions.context(session.sessionToken)).branchId).toBe('abuja');
    app.upstream.inspect.mockResolvedValueOnce({ ...app.scope, branchIds: ['lagos'] });
    await expect(app.sessions.context(session.sessionToken)).rejects.toMatchObject({ status: 403 });
    app.upstream.inspect.mockRejectedValueOnce(Object.assign(new Error('logout'), { status: 401 }));
    await expect(app.sessions.context(session.sessionToken)).rejects.toMatchObject({ status: 401 });
    app.upstream.inspect.mockRejectedValueOnce(Object.assign(new Error('offline'), { status: 502 }));
    await expect(app.sessions.context(session.sessionToken)).rejects.toMatchObject({ status: 502 });
  });
  it('revokes a mismatched tenant and invalidates disconnected sessions', async () => {
    const app = fixture(); app.upstream.inspect.mockResolvedValueOnce({ ...app.scope, tenantId: 'wrong' });
    await expect(app.login()).rejects.toMatchObject({ status: 403 });
    expect(app.upstream.revoke).toHaveBeenCalledWith(app.grant);
    const session = await app.login(); await app.sessions.disconnect(session.sessionToken);
    await expect(app.sessions.context(session.sessionToken)).rejects.toMatchObject({ status: 401 });
    const next = await app.login(); app.advance();
    await expect(app.sessions.context(next.sessionToken)).rejects.toMatchObject({ status: 401 });
  });
});
