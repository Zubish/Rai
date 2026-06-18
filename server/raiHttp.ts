import type { IncomingMessage, ServerResponse } from "node:http";
import { getOpenAiModel, isOpenAiConfigured, loadRaiEnvironment } from "./env";
import { checkRateLimit } from "./rateLimit";
import { runRaiChat } from "./raiChatService";
import { validateRaiChatBody } from "./requestValidation";

const maxBodyBytes = 32 * 1024;

export async function handleRaiApiRequest(
  request: IncomingMessage,
  response: ServerResponse
): Promise<boolean> {
  loadRaiEnvironment();
  const url = request.url ?? "";

  if (request.method === "GET" && url.startsWith("/api/rai/health")) {
    writeJson(response, 200, {
      ok: true,
      service: "rai-api",
      openaiConfigured: isOpenAiConfigured(),
      model: getOpenAiModel()
    });
    return true;
  }

  if (!url.startsWith("/api/rai/chat")) {
    return false;
  }

  if (request.method !== "POST") {
    writeJson(response, 405, { ok: false, error: "Method not allowed" });
    return true;
  }

  const rateLimit = checkRateLimit(request);
  if (!rateLimit.ok) {
    response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    writeJson(response, 429, { ok: false, error: "Too many Rai requests. Try again shortly." });
    return true;
  }

  if (!String(request.headers["content-type"] ?? "").includes("application/json")) {
    writeJson(response, 415, { ok: false, error: "Content-Type must be application/json" });
    return true;
  }

  try {
    const body = await readJsonBody(request);
    const validation = validateRaiChatBody(body);
    if (!validation.ok) {
      writeJson(response, validation.status, { ok: false, error: validation.error });
      return true;
    }

    const result = await runRaiChat(validation.value);

    writeJson(response, 200, { ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Rai API error.";
    const status = message.includes("too large") ? 413 : 500;
    writeJson(response, status, {
      ok: false,
      error: status === 413 ? message : "Rai API could not complete the request."
    });
  }

  return true;
}

function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let rawBody = "";
    let bytes = 0;

    request.on("data", (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > maxBodyBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      rawBody += chunk.toString("utf8");
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(rawBody || "{}") as Record<string, unknown>);
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}
