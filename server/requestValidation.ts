import type { RaiChatRequest } from "./raiChatService";

const maxMessageLength = 2_000;
const maxBranchIds = 20;

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
      tenantId: typeof body.tenantId === "string" ? body.tenantId : undefined,
      branchIds
    }
  };
}
