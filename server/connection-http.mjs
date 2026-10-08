import './env.mjs';
import { createRxLedgerConnection } from './rxledger-connection.mjs';
import { createConnectionStore } from './connection-store.mjs';
import { createConnectionSessions } from './connection-session.mjs';
import { publicFailure } from './public-failure.mjs';

let sessions;
export function sessionCookie(request, name = '__Host-rai-session') {
  const cookies = request.headers?.cookie || '';
  if (typeof cookies !== 'string') return '';
  return cookies.split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}
export async function connectionSessions() {
  if (process.env.RAI_CONNECTION_ENABLED !== 'true') throw Object.assign(new Error('Secure RxLedger connection is not enabled.'), { status: 503, code: 'connection_not_enabled' });
  if (!sessions) sessions = createConnectionStore().then(store => createConnectionSessions({ store, upstream: createRxLedgerConnection(), origin: process.env.RAI_APP_ORIGIN, rxOrigin: process.env.RXLEDGER_BASE_URL, encryptionKey: process.env.RAI_SESSION_ENCRYPTION_KEY })).catch(error => { sessions = undefined; throw error; });
  return sessions;
}
export function requireOrigin(request) {
  if (!process.env.RAI_APP_ORIGIN || request.headers?.origin !== process.env.RAI_APP_ORIGIN) throw Object.assign(new Error('Same-origin request required.'), { status: 403 });
}
export async function resolveConnectedContext(request) {
  requireOrigin(request);
  const api = await connectionSessions();
  await api.rateLimit(`chat:${sessionCookie(request)}`);
  return api.context(sessionCookie(request));
}
const cookie = (name, token, age) => `${name}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`;
const audit = (action, status) => console.info(JSON.stringify({ event: 'rai_connection', action, status }));
export async function handleConnection(request, response, callback = false) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const api = await connectionSessions();
    const address = process.env.VERCEL ? request.headers?.['x-forwarded-for'] : request.socket?.remoteAddress;
    await api.rateLimit(`connection:${sessionCookie(request) || sessionCookie(request, '__Host-rai-login') || String(address || 'unknown').split(',')[0]}`);
    if (callback) {
      if (request.method !== 'GET') return response.status(405).json({ error: { message: 'Use GET.' } });
      const params = new URL(request.url, api.origin).searchParams;
      const result = await api.callback({ browserToken: sessionCookie(request, '__Host-rai-login'), state: params.get('state'), code: params.get('code'), denied: params.get('error') === 'access_denied' });
      response.setHeader('Set-Cookie', [cookie('__Host-rai-login', '', 0), ...(result.sessionToken ? [cookie('__Host-rai-session', result.sessionToken, result.expiresIn)] : [])]);
      response.setHeader('Location', `${api.origin}/?connection=${result.denied ? 'denied' : 'connected'}`);
      audit(result.denied ? 'denied' : 'connected', 303);
      return response.status(303).end();
    }
    if (request.method === 'GET') {
      if (!sessionCookie(request)) return response.status(200).json({ data: { connected: false, configured: true } });
      const context = await api.context(sessionCookie(request));
      return response.status(200).json({ data: { connected: true, tenantId: context.tenantId, role: context.role, branchId: context.branchId, branchIds: context.branchIds, capabilities: context.capabilities } });
    }
    if (request.method !== 'POST') return response.status(405).json({ error: { message: 'Use GET or POST.' } });
    requireOrigin(request);
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 2048) throw Object.assign(new Error('Invalid connection request.'), { status: 422 });
    if (body.action === 'start') {
      const result = await api.start(body.tenant);
      response.setHeader('Set-Cookie', cookie('__Host-rai-login', result.browserToken, 300));
      audit('started', 200);
      return response.status(200).json({ data: { url: result.url } });
    }
    if (body.action === 'disconnect') {
      response.setHeader('Set-Cookie', cookie('__Host-rai-session', '', 0));
      await api.disconnect(sessionCookie(request));
      audit('disconnected', 200);
      return response.status(200).json({ data: { connected: false } });
    }
    if (body.action === 'select_branch') {
      await api.selectBranch(sessionCookie(request), body.branchId);
      audit('branch_selected', 200);
      return response.status(200).json({ data: { selected: true } });
    }
    throw Object.assign(new Error('Unknown connection action.'), { status: 422 });
  } catch (error) {
    const { status, error: feedback } = publicFailure(error);
    audit(callback ? 'callback_failed' : 'request_failed', status);
    if (callback) response.setHeader('Set-Cookie', cookie('__Host-rai-login', '', 0));
    return response.status(status).json({ error: feedback });
  }
}
