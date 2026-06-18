// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateRaiChatBody } from "./requestValidation";

describe("Rai request validation", () => {
  it("accepts a trimmed valid chat request", () => {
    const result = validateRaiChatBody({
      message: "  Forecast antihypertensive demand  ",
      tenantId: "tenant-1",
      branchIds: ["main", 42, "clinic"] as unknown[]
    });

    expect(result).toEqual({
      ok: true,
      value: {
        message: "Forecast antihypertensive demand",
        tenantId: "tenant-1",
        branchIds: ["main", "clinic"]
      }
    });
  });

  it("rejects invalid message, tenant, branch, and length shapes", () => {
    expect(validateRaiChatBody({}).ok).toBe(false);
    expect(validateRaiChatBody({ message: " " }).ok).toBe(false);
    expect(validateRaiChatBody({ message: "x".repeat(2_001) }).ok).toBe(false);
    expect(validateRaiChatBody({ message: "hello", tenantId: 12 }).ok).toBe(false);
    expect(validateRaiChatBody({ message: "hello", branchIds: "main" }).ok).toBe(false);
  });

  it("limits branch scope length", () => {
    const result = validateRaiChatBody({
      message: "business health",
      branchIds: Array.from({ length: 25 }, (_, index) => `branch-${index}`)
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.branchIds).toHaveLength(20);
    }
  });
});
