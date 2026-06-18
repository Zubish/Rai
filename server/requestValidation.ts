import type { RaiChatRequest } from "./raiChatService";

const maxMessageLength = 2_000;
const maxBranchIds = 20;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ValidationResult =
  | { ok: true; value: RaiChatRequest }
  | { ok: false; status: number; error: string };

export function validateRaiChatBody(body: Record<string, unknown>): ValidationResult {
  if (typeof body.message !== "string") {
    return { ok: false, status: 400, error: "Request body must include a message string." };
  }

  const message = body.message.trim();
  if (!message) {
    return { ok: false, status: 400, error: "Message cannot be empty." };
  }

  if (message.length > maxMessageLength) {
    return {
      ok: false,
      status: 400,
      error: `Message is too long. Maximum length is ${maxMessageLength} characters.`
    };
  }

  if (body.tenantId !== undefined && typeof body.tenantId !== "string") {
    return { ok: false, status: 400, error: "tenantId must be a string when provided." };
  }

  if (body.sessionId !== undefined) {
    if (typeof body.sessionId !== "string" || !uuidPattern.test(body.sessionId)) {
      return { ok: false, status: 400, error: "sessionId must be a valid UUID when provided." };
    }
  }

  if (body.branchIds !== undefined && !Array.isArray(body.branchIds)) {
    return { ok: false, status: 400, error: "branchIds must be an array of strings when provided." };
  }

  const branchIds = Array.isArray(body.branchIds)
    ? body.branchIds.filter((item): item is string => typeof item === "string").slice(0, maxBranchIds)
    : undefined;

  return {
    ok: true,
    value: {
      message,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
      tenantId: typeof body.tenantId === "string" ? body.tenantId : undefined,
      branchIds
    }
  };
}
