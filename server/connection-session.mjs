import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createPkce } from './rxledger-connection.mjs';

export const digest = value => createHash('sha256').update(value).digest('hex');
const opaque = () => randomBytes(32).toString('base64url');
const valid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const fail = (status, message) => Object.assign(new Error(message), { status, code: 'connection_failed' });

export function createConnectionSessions({ store, upstream, origin, rxOrigin, encryptionKey, now = Date.now }) {
  const app = new URL(origin), rx = new URL(rxOrigin);
  const key = Buffer.from(encryptionKey || '', 'base64');
  if (key.length !== 32 || app.protocol !== 'https:' || rx.protocol !== 'https:' || app.origin !== origin || rx.origin !== rxOrigin) throw fail(503, 'Secure connection configuration is incomplete.');
  const callback = `${app.origin}/api/rai/callback`;
  function encrypt(value) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(app.origin));
    return Buffer.concat([iv, cipher.update(JSON.stringify(value)), cipher.final(), cipher.getAuthTag()]).toString('base64');
  }
  function decrypt(value) {
    const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(app.origin)); decipher.setAuthTag(bytes.subarray(-16));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString());
  }
  return {
    origin: app.origin,
    async rateLimit(key) {
      if (store.allow && !await store.allow(digest(key), now())) throw fail(429, 'Too many connection requests. Try again in a minute.');
    },
    async start(tenant) {
      if (typeof tenant !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(tenant)) throw fail(422, 'Enter your RxLedger workspace slug.');
      const pkce = createPkce(), browserToken = opaque();
      await store.save('login', digest(browserToken), encrypt({ ...pkce, tenant }), now() + 300000);
      const target = new URL(`/${tenant}`, rx.origin);
      target.search = new URLSearchParams({ rai_connect: '1', state: pkce.state, code_challenge: pkce.challenge, redirect_uri: callback }).toString();
      return { browserToken, url: target.href };
    },
    async callback({ browserToken, state, code, denied }) {
      if (!valid(browserToken) || !valid(state)) throw fail(401, 'Connection expired. Start again from Rai.');
      const record = await store.take('login', digest(browserToken), now());
      if (!record) throw fail(401, 'Connection expired. Start again from Rai.');
      const login = decrypt(record);
      if (!valid(login.state) || !timingSafeEqual(Buffer.from(state), Buffer.from(login.state))) throw fail(401, 'Connection could not be verified.');
      if (denied) return { denied: true };
      if (!valid(code)) throw fail(401, 'Invalid authorization code.');
      const grant = await upstream.exchange({ code, verifier: login.verifier, redirectUri: callback });
      try {
        const scope = await upstream.inspect(grant.accessToken);
        if (scope.tenantId !== login.tenant) throw fail(403, 'Workspace does not match the connection request.');
        const sessionToken = opaque(), expires = now() + grant.expiresIn * 1000;
        await store.save('session', digest(sessionToken), encrypt({ accessToken: grant.accessToken, branchId: scope.branchIds[0], tenantId: scope.tenantId, userId: scope.userId }), expires);
        return { sessionToken, expiresIn: grant.expiresIn };
      } catch (error) { await upstream.revoke(grant.accessToken).catch(() => {}); throw error; }
    },
    async context(token) {
      if (!valid(token)) throw fail(401, 'Connect your RxLedger account first.');
      const record = await store.get('session', digest(token), now());
      if (!record) throw fail(401, 'Connection expired. Reconnect RxLedger.');
      const session = decrypt(record), scope = await upstream.inspect(session.accessToken);
      if (scope.tenantId !== session.tenantId || scope.userId !== session.userId || !scope.branchIds.includes(session.branchId)) throw fail(403, 'RxLedger access has changed. Reconnect.');
      return { ...scope, branchId: session.branchId, delegatedToken: session.accessToken, mode: 'connected' };
    },
    async selectBranch(token, branchId) {
      const context = await this.context(token);
      if (!context.branchIds.includes(branchId)) throw fail(403, 'This branch is outside your consent.');
      await store.update('session', digest(token), record => encrypt({ ...decrypt(record), branchId }), now());
    },
    async disconnect(token) {
      if (!valid(token)) return;
      const record = await store.take('session', digest(token), now());
      if (record) await upstream.revoke(decrypt(record).accessToken);
    }
  };
}
