import { afterEach, describe, expect, it, vi } from "vitest";
import { createOllamaProvider } from "./ollama-provider.mjs";

afterEach(() => vi.unstubAllEnvs());

describe("Ollama provider", () => {
  it('does not present demo tenant or branch identifiers as authenticated scope', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: { content: 'No live connection.' } }) });
    const provider = createOllamaProvider({ baseUrl: 'http://localhost:11434', fetchImpl });
    await provider.chat({ message: 'Can you help?', context: { tenantId: 'demo', branchId: 'abuja-sickbay', role: 'viewer', connection: { connected: false, mode: 'demo' } } });
    const system = JSON.parse(fetchImpl.mock.calls[0][1].body).messages[0].content;
    expect(system).toContain('NOT connected');
    expect(system).not.toContain('abuja-sickbay');
    expect(system).not.toContain('Current authorised scope');
  });
  it('blocks loopback inference in production before sending any data', async () => {
    vi.stubEnv('VERCEL', '1');
    const fetchImpl = vi.fn();
    const provider = createOllamaProvider({ baseUrl: 'http://127.0.0.1:11434', fetchImpl });
    await expect(provider.health()).resolves.toMatchObject({ reachable: false, configured: false });
    await expect(provider.chat({ message: 'Private metrics', context: {} })).rejects.toMatchObject({ code: 'model_not_configured', status: 503 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('requires HTTPS and authentication for a remote inference service', async () => {
    for (const baseUrl of ['http://models.example', 'https://models.example/?token=secret', 'https://user:password@models.example', 'https://models.example/#fragment']) {
      const fetchImpl = vi.fn();
      await expect(createOllamaProvider({ baseUrl, apiKey: 'test-token', fetchImpl }).health()).resolves.toMatchObject({ configured: false });
      expect(fetchImpl).not.toHaveBeenCalled();
    }
    await expect(createOllamaProvider({ baseUrl: 'https://models.example', apiKey: '', fetchImpl: vi.fn() }).health()).resolves.toMatchObject({ configured: false });
  });

  it('authenticates both hosted requests and refuses redirects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ models: [{ name: 'llama3.2' }], message: { content: 'Verified answer' } }) });
    const provider = createOllamaProvider({ baseUrl: 'https://models.example', apiKey: 'synthetic-token', fetchImpl });
    await provider.health();
    await provider.chat({ message: 'Hello', context: {} });
    for (const [, options] of fetchImpl.mock.calls) expect(options).toMatchObject({ redirect: 'error', headers: { authorization: 'Bearer synthetic-token' } });
  });

  it('sanitizes invalid model JSON instead of exposing upstream failures', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('private upstream credential'); } });
    await expect(createOllamaProvider({ baseUrl: 'http://localhost:11434', fetchImpl }).chat({ message: 'Hi', context: {} })).rejects.toMatchObject({ code: 'invalid_model_response', status: 502 });
  });
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
      context: { tenantId: "demo", branchId: "lagos", role: "owner", userId: "user-1" }
    });

    expect(result).toEqual({ text: "I need a date range to continue.", model: "llama3.2" });
    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:11434/api/chat", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ model: "llama3.2", stream: false, options: { temperature: 0.2 } });
  });

  it("returns a safe service error when the local runtime cannot be reached", async () => {
    const provider = createOllamaProvider({ fetchImpl: vi.fn().mockRejectedValue(new Error("connection refused")) });

    await expect(provider.chat({
      message: "Show today’s sales",
      context: { tenantId: "demo", branchId: "lagos", role: "owner", userId: "user-1" }
    })).rejects.toMatchObject({ code: "model_unavailable", status: 503 });
  });
});
