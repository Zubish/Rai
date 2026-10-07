import { describe, expect, it, vi } from "vitest";
import { createRxLedgerConnection, createPkce } from "./rxledger-connection.mjs";

describe("delegated RxLedger connection client", () => {
  it("creates a fresh verifier, challenge and state", () => {
    const first = createPkce(), second = createPkce();
    expect(first.verifier).toHaveLength(43);
    expect(first.challenge).toHaveLength(43);
    expect(first.state).not.toBe(second.state);
    expect(first.challenge).not.toBe(first.verifier);
  });
  it("exchanges only at the configured HTTPS endpoint without following redirects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { accessToken: "a".repeat(43), expiresIn: 900, tokenType: "Bearer" } }) });
    const client = createRxLedgerConnection({ baseUrl: "https://rxledger.example", apiKey: "service-key", fetchImpl });
    await client.exchange({ code: "c".repeat(43), verifier: "v".repeat(43), redirectUri: "https://rai.example/callback" });
    expect(fetchImpl).toHaveBeenCalledWith("https://rxledger.example/api/rai/connection", expect.objectContaining({ redirect: "error", headers: expect.objectContaining({ authorization: "Bearer service-key" }) }));
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ action: "exchange", code_verifier: "v".repeat(43) });
  });
  it("rejects insecure origins and malformed or expired upstream responses", async () => {
    expect(() => createRxLedgerConnection({ baseUrl: "http://rxledger.example", apiKey: "test" })).toThrow();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ secret: "private" }) });
    const client = createRxLedgerConnection({ baseUrl: "https://rxledger.example", apiKey: "test", fetchImpl });
    await expect(client.inspect("x")).rejects.toMatchObject({ status: 401 });
    fetchImpl.mockResolvedValue({ ok: true, json: async () => ({ data: { userId: "a" } }) });
    await expect(client.inspect("x")).rejects.toMatchObject({ status: 502 });
    await expect(client.exchange({ code: "c", verifier: "v", redirectUri: "https://rai.example/callback" })).rejects.toMatchObject({ status: 502 });
  });
  it("projects verified identity without forwarding upstream private fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { tenantId: "t", userId: "u", role: "inventory", branchIds: ["b"], capabilities: ["inventory_analytics"], sessionHash: "private" } }) });
    const client = createRxLedgerConnection({ baseUrl: "https://rxledger.example", apiKey: "test", fetchImpl });
    expect(await client.inspect("token")).toEqual({ tenantId: "t", userId: "u", role: "inventory", branchIds: ["b"], capabilities: ["inventory_analytics"] });
    fetchImpl.mockResolvedValue({ ok: true, json: async () => ({ data: { revoked: true } }) });
    await expect(client.revoke("token")).resolves.toEqual({ revoked: true });
  });
});
