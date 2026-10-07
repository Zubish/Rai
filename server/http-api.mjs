import { createRaiService, apiError } from "./rai-api.mjs";

const service = createRaiService();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const requests = new Map();

export async function handleApiRequest(request, response) {
  setSecurityHeaders(response);
  if (request.method === "OPTIONS") return response.writeHead(204).end();

  try {
    enforceRateLimit(request);
    if (request.method === "GET" && request.url === "/api/rai/health") return sendJson(response, 200, { data: await service.health() });
    if (request.method === "POST" && request.url === "/api/rai/chat") {
      const body = await readJson(request);
      const context = getContext(request);
      const data = await service.chat({
        message: body.message,
        conversationId: body.conversationId,
        context,
        dataContext: body.dataContext ?? null
      });
      return sendJson(response, 200, { data });
    }
    return sendJson(response, 404, { error: { code: "not_found", message: "Rai endpoint not found." } });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    const message = status >= 500 ? "Rai could not complete that request right now." : error.message;
    return sendJson(response, status, { error: { code: error.code || "internal_error", message } });
  }
}

function getContext(request) {
  const tenantId = request.headers["x-rai-tenant-id"];
  const branchId = request.headers["x-rai-branch-id"];
  const role = request.headers["x-rai-role"];
  const isLocalDevelopment = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
  if (isLocalDevelopment) return { tenantId: tenantId || "demo", branchId: branchId || "abuja-sickbay", role: role || "pharmacy_technician" };
  if (!tenantId || !branchId || !role) throw apiError("unauthorized", "Sign in through RxLedger to use Rai.", 401);
  return { tenantId, branchId, role };
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
