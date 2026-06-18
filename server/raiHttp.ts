import type { IncomingMessage, ServerResponse } from "node:http";
import { getOpenAiModel, isOpenAiConfigured, loadRaiEnvironment } from "./env.js";
import {
  isDatabaseConfigured,
  listLibraryItems,
  persistRaiChatExchange,
  saveLibraryItem
} from "./raiPersistence.js";
import { getRxLedgerConnectionStatus } from "./rxledgerApiConnector.js";
import { checkRateLimit } from "./rateLimit.js";
import { runRaiChat } from "./raiChatService.js";
import { validateRaiChatBody } from "./requestValidation.js";

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
      databaseConfigured: isDatabaseConfigured(),
      rxledgerConfigured: getRxLedgerConnectionStatus().configured,
      model: getOpenAiModel()
    });
    return true;
  }

  if (url.startsWith("/api/rai/library")) {
    return handleLibraryRequest(request, response);
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
    const sessionId = await persistRaiChatExchange(validation.value, result);

    writeJson(response, 200, { ok: true, data: { ...result, sessionId: sessionId ?? result.sessionId } });
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

async function handleLibraryRequest(
  request: IncomingMessage,
  response: ServerResponse
): Promise<boolean> {
  if (request.method === "GET") {
    const items = await listLibraryItems();
    writeJson(response, 200, { ok: true, data: { items } });
    return true;
  }

  if (request.method !== "POST") {
    writeJson(response, 405, { ok: false, error: "Method not allowed" });
    return true;
  }

  if (!String(request.headers["content-type"] ?? "").includes("application/json")) {
    writeJson(response, 415, { ok: false, error: "Content-Type must be application/json" });
    return true;
  }

  try {
    const body = await readJsonBody(request);
    const item = validateLibraryItem(body);
    if (!item.ok) {
      writeJson(response, 400, { ok: false, error: item.error });
      return true;
    }

    const saved = await saveLibraryItem(item.value);
    writeJson(response, 200, {
      ok: true,
      data: {
        persisted: Boolean(saved),
        item: saved ?? item.value
      }
    });
  } catch {
    writeJson(response, 500, { ok: false, error: "Rai library could not save the item." });
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

function validateLibraryItem(body: Record<string, unknown>):
  | {
      ok: true;
      value: {
        name: string;
        type: "image" | "file" | "report" | "spreadsheet" | "insight";
        source: "upload" | "rai";
        metadata?: Record<string, unknown>;
        tenantId?: string;
        branchId?: string;
      };
    }
  | { ok: false; error: string } {
  const validTypes = new Set(["image", "file", "report", "spreadsheet", "insight"]);
  const validSources = new Set(["upload", "rai"]);

  if (typeof body.name !== "string" || !body.name.trim()) {
    return { ok: false, error: "Library item name is required." };
  }

  if (typeof body.type !== "string" || !validTypes.has(body.type)) {
    return { ok: false, error: "Library item type is invalid." };
  }

  if (typeof body.source !== "string" || !validSources.has(body.source)) {
    return { ok: false, error: "Library item source is invalid." };
  }

  return {
    ok: true,
    value: {
      name: body.name.trim(),
      type: body.type as "image" | "file" | "report" | "spreadsheet" | "insight",
      source: body.source as "upload" | "rai",
      metadata: isObjectRecord(body.metadata) ? body.metadata : undefined,
      tenantId: typeof body.tenantId === "string" ? body.tenantId : undefined,
      branchId: typeof body.branchId === "string" ? body.branchId : undefined
    }
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}
