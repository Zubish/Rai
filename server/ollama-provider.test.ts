import { describe, expect, it, vi } from "vitest";
import { createOllamaProvider } from "./ollama-provider.mjs";

describe("Ollama provider", () => {
  it("reports whether the configured local model is available", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: "llama3.2:latest" }] })
    });
    const provider = createOllamaProvider({ baseUrl: "http://localhost:11434", model: "llama3.2", fetchImpl });

    await expect(provider.health()).resolves.toMatchObject({ reachable: true, modelAvailable: true });
  });

  it("sends a non-streaming, low-temperature chat request to Ollama", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "I need a date range to continue." } })
    });
    const provider = createOllamaProvider({ baseUrl: "http://localhost:11434", model: "llama3.2", fetchImpl });

    const result = await provider.chat({
      message: "Compare sales",
      context: { tenantId: "demo", branchId: "lagos", role: "owner" }
    });

    expect(result).toEqual({ text: "I need a date range to continue.", model: "llama3.2" });
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:11434/api/chat", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ model: "llama3.2", stream: false, options: { temperature: 0.2 } });
  });

  it("returns a safe service error when the local runtime cannot be reached", async () => {
    const provider = createOllamaProvider({ fetchImpl: vi.fn().mockRejectedValue(new Error("connection refused")) });

    await expect(provider.chat({
      message: "Show today’s sales",
      context: { tenantId: "demo", branchId: "lagos", role: "owner" }
    })).rejects.toMatchObject({ code: "model_unavailable", status: 503 });
  });
});
