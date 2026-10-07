import { describe, expect, it, vi } from "vitest";
import { createRaiService } from "./rai-api.mjs";

describe("Rai chat service", () => {
  it("answers a greeting without sending it to a model", async () => {
    const provider = { chat: vi.fn() };
    const service = createRaiService({ provider });

    const result = await service.chat({
      message: "Hi Rai",
      context: { tenantId: "demo", branchId: "abuja-sickbay", role: "pharmacy_technician" }
    });

    expect(result.message.text).toContain("Hello");
    expect(provider.chat).not.toHaveBeenCalled();
    expect(result.provider.id).toBe("deterministic");
  });

  it("passes validated branch context and grounded constraints to the configured model", async () => {
    const provider = { chat: vi.fn().mockResolvedValue({ text: "I need the sales period before I can compare branches.", model: "llama3.2" }) };
    const service = createRaiService({ provider });

    const result = await service.chat({
      message: "Compare sales for Lagos branch",
      conversationId: "conversation-1",
      context: { tenantId: "totalenergies", branchId: "lagos", role: "owner" }
    });

    expect(provider.chat).toHaveBeenCalledWith(expect.objectContaining({
      message: "Compare sales for Lagos branch",
      context: expect.objectContaining({ tenantId: "totalenergies", branchId: "lagos" })
    }));
    expect(result.conversationId).toBe("conversation-1");
    expect(result.message.text).toContain("sales period");
    expect(result.provider).toEqual({ id: "ollama", model: "llama3.2", grounded: false });
  });

  it("rejects an empty chat message before it reaches a provider", async () => {
    const provider = { chat: vi.fn() };
    const service = createRaiService({ provider });

    await expect(service.chat({
      message: "   ",
      context: { tenantId: "demo", branchId: "abuja-sickbay", role: "owner" }
    })).rejects.toMatchObject({ code: "validation_error", status: 422 });
    expect(provider.chat).not.toHaveBeenCalled();
  });
});
