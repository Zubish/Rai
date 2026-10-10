import { createRaiService, apiError } from "./rai-api.mjs";
import { resolveRequestContext, validateChatBody } from "./request-context.mjs";
import { handleConnection, resolveConnectedContext, sessionCookie } from './connection-http.mjs';
import { publicFailure } from './public-failure.mjs';
import { createHealthPassAnalytics, healthPassFailure } from './healthpass-analytics.mjs';

const service = createRaiService();
const healthPassAnalytics = createHealthPassAnalytics();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const requests = new Map();

export async function handleApiRequest(request, response) {
  setSecurityHeaders(response);
  if (request.method === "OPTIONS") return response.writeHead(204).end();

  try {
    enforceRateLimit(request);
    if (request.method === 'POST' && request.url === '/api/rai/healthpass') {
      try { request.body = await readJson(request); return sendJson(response, 200, { data: await healthPassAnalytics(request) }); }
      catch (error) { const failure = healthPassFailure(error); return sendJson(response, failure.status, { error: failure.error }); }
    }
    if (request.method === "GET" && request.url === "/api/rai/health") return sendJson(response, 200, { data: await service.health() });
    if (request.url.split('?')[0] === '/api/rai/connection' || request.url.split('?')[0] === '/api/rai/callback') {
      if (request.method === 'POST') request.body = await readJson(request);
      const adapter = {
        code: 200,
        setHeader: response.setHeader.bind(response),
        status(code) { this.code = code; return this; },
        json(payload) { return sendJson(response, this.code, payload); },
        end() { response.writeHead(this.code); response.end(); }
      };
      return handleConnection(request, adapter, request.url.split('?')[0] === '/api/rai/callback');
    }
    if (request.method === "POST" && request.url === "/api/rai/chat") {
      const context = sessionCookie(request) ? await resolveConnectedContext(request) : resolveRequestContext(request, { local: true });
      const body = validateChatBody(await readJson(request));
      const data = await service.chat({
        message: body.message,
        conversationId: body.conversationId,
        context
      });
      return sendJson(response, 200, { data });
    }
    return sendJson(response, 404, { error: { code: "not_found", message: "Rai endpoint not found." } });
  } catch (error) {
    const failure = publicFailure(error);
    return sendJson(response, failure.status, { error: failure.error });
  }
}

function enforceRateLimit(request) {
  const key = request.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const record = requests.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > record.resetAt) Object.assign(record, { count: 0, resetAt: now + RATE_WINDOW_MS });
  record.count += 1;
  requests.set(key, record);
  if (record.count > RATE_LIMIT) throw apiError("rate_limit_exceeded", "Too many requests. Please wait a minute and try again.", 429);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 16_384) reject(apiError("payload_too_large", "Request body is too large.", 413));
    });
    request.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(apiError("invalid_json", "Request body must be valid JSON.", 400)); }
    });
    request.on("error", () => reject(apiError("invalid_request", "Request could not be read.", 400)));
  });
}

function setSecurityHeaders(response) {
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("cache-control", "no-store");
}

function sendJson(response, status, payload) {
  response.writeHead(status);
  response.end(JSON.stringify(payload));
}
