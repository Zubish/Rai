import { describe, expect, it, vi } from "vitest";
import { createRaiService } from "./rai-api.mjs";

describe("Rai chat service", () => {
  it('explains why the clarified cost request cannot run and preserves today', async () => {
    const provider = { chat: vi.fn() };
    const service = createRaiService({ provider, rxLedger: { isConfigured: false }, now: () => new Date('2026-10-08T10:00:00Z') });
    const context = { tenantId: 'demo', branchId: 'local-demo', role: 'viewer', userId: 'demo', mode: 'demo' };
    const first = await service.chat({ message: 'What changed in my pharmacy today?', context });
    const next = await service.chat({ message: 'cost', conversationId: first.conversationId, context });
    expect(next.message.text).toContain('because');
    expect(next.message.text).toContain('not connected');
    expect(next.message.text).toContain('Next');
    expect(next.audit.dateRange.startDate).toBe('2026-10-08');
    expect(provider.chat).not.toHaveBeenCalled();
  });
  it('answers the reported demo connection exchange without involving the model', async () => {
    const provider = { chat: vi.fn().mockResolvedValue({ text: 'Yes, connected to Abuja.', model: 'test' }) };
    const rxLedger = { isConfigured: true, analyticsSnapshot: vi.fn() };
    const service = createRaiService({ provider, rxLedger });
    const context = { tenantId: 'demo', branchId: 'abuja-sickbay', role: 'viewer', userId: 'demo', mode: 'demo' };
    let conversationId;
    for (const message of ['are you connected to rxledger', 'which branch am i currently on', "but i don't seem to be signed in, so how do you know this?"]) {
      const result = await service.chat({ message, conversationId, context });
      conversationId = result.conversationId;
      expect(result.message.text).toContain('not connected');
      expect(result.message.text).not.toContain('abuja');
      expect(result.audit.branchId).toBeNull();
    }
    expect(provider.chat).not.toHaveBeenCalled();
    expect(rxLedger.analyticsSnapshot).not.toHaveBeenCalled();
  });
  it('does not infer exact sales quantities from average usage', async () => {
    const provider = { chat: vi.fn() };
    const rxLedger = { isConfigured: true, analyticsSnapshot: vi.fn().mockResolvedValue({ data: { medications: [{ medication_name: 'Aprovel', average_monthly_usage: 300 }] }, meta: { source: 'rxledger', filters: { capabilities: ['sales_analytics'] } } }) };
    const service = createRaiService({ provider, rxLedger });
    const result = await service.chat({ message: 'How many Aprovel were sold yesterday?', context: { tenantId: 'test', branchId: 'lagos', role: 'admin', userId: 'test' } });
    expect(result.message.text).toContain('does not expose exact units sold');
    expect(result.message.text).not.toContain('300');
    expect(provider.chat).not.toHaveBeenCalled();
  });
  it('keeps thanks and capability questions conversational without retrieving data', async () => {
    const provider = { chat: vi.fn() }, rxLedger = { isConfigured: true, analyticsSnapshot: vi.fn() };
    const service = createRaiService({ provider, rxLedger });
    const context = { tenantId: 'test', branchId: 'lagos', role: 'admin', userId: 'test' };
    for (const message of ['Thank you', 'What can you do?']) {
      const result = await service.chat({ message, context });
      expect(result.message.text.length).toBeGreaterThan(10);
      expect(result.warnings).toEqual([]);
    }
    expect(rxLedger.analyticsSnapshot).not.toHaveBeenCalled();
    expect(provider.chat).not.toHaveBeenCalled();
  });
  it('requests yesterday rather than a fixed thirty-day window', async () => {
    const provider = { chat: vi.fn().mockResolvedValue({ text: 'Verified demand window.', model: 'test' }) };
    const rxLedger = { isConfigured: true, analyticsSnapshot: vi.fn().mockResolvedValue({ data: { medications: [] }, meta: { source: 'rxledger', filters: { capabilities: ['inventory_analytics'] } } }) };
    const service = createRaiService({ provider, rxLedger, now: () => new Date('2026-10-07T23:30:00Z') });
    const context = { tenantId: 'test', branchId: 'lagos', role: 'admin', userId: 'test', capabilities: ['inventory_analytics'] };
    const first = await service.chat({ message: 'Inventory last month', context });
    await service.chat({ message: 'And yesterday?', conversationId: first.conversationId, context });
    expect(rxLedger.analyticsSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({ startDate: '2026-10-07', endDate: '2026-10-07', capabilities: ['inventory_analytics'] }));
  });
  it("isolates conversation history by user and branch", async () => {
    const service = createRaiService({ provider: { chat: vi.fn() }, rxLedger: { isConfigured: false } });
    const context = { tenantId: "tenant", branchId: "lagos", role: "inventory", userId: "a" };
    const first = await service.chat({ message: "Hi", context });
    await expect(service.chat({ message: "Hi", conversationId: first.conversationId, context: { ...context, userId: "b" } })).rejects.toMatchObject({ status: 403 });
    await expect(service.chat({ message: "Hi", conversationId: first.conversationId, context: { ...context, branchId: "abuja" } })).rejects.toMatchObject({ status: 403 });
  });
  it("never retrieves real data for a local demo user", async () => {
    const rxLedger = { isConfigured: true, analyticsSnapshot: vi.fn() };
    const service = createRaiService({ rxLedger, provider: { chat: vi.fn().mockResolvedValue({ text: "Data is unavailable.", model: "test" }) } });
    await service.chat({ message: "Inventory", context: { tenantId: "demo", branchId: "lagos", role: "viewer", userId: "demo", mode: "demo" } });
    expect(rxLedger.analyticsSnapshot).not.toHaveBeenCalled();
  });
  it("answers a greeting without sending it to a model", async () => {
    const provider = { chat: vi.fn() };
    const service = createRaiService({ provider });

    const result = await service.chat({
      message: "Hi Rai",
      context: { tenantId: "demo", branchId: "abuja-sickbay", role: "pharmacy_technician", userId: "user-1" }
    });

    expect(result.message.text).toContain("Hello");
    expect(provider.chat).not.toHaveBeenCalled();
    expect(result.provider.id).toBe("deterministic");
  });

  it("passes validated branch context and grounded constraints to the configured model", async () => {
    const provider = { chat: vi.fn().mockResolvedValue({ text: "I need the sales period before I can compare branches.", model: "llama3.2" }) };
    const service = createRaiService({ provider });

    const result = await service.chat({
      message: "Explain how to organise pharmacy operations",
      conversationId: "conversation-1",
      context: { tenantId: "totalenergies", branchId: "lagos", role: "admin", userId: "user-1", mode: 'connected', branchIds: ['lagos'], capabilities: ['sales_analytics'], delegatedToken: 'x'.repeat(43) }
    });

    expect(provider.chat).toHaveBeenCalledWith(expect.objectContaining({
      message: "Explain how to organise pharmacy operations",
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
      context: { tenantId: "demo", branchId: "abuja-sickbay", role: "owner", userId: "user-1" }
    })).rejects.toMatchObject({ code: "validation_error", status: 422 });
    expect(provider.chat).not.toHaveBeenCalled();
  });

  it("retrieves a reduced RxLedger snapshot before asking the model an analytics question", async () => {
    const provider = { chat: vi.fn().mockResolvedValue({ text: "Exforge needs review within four days.", model: "llama3.2" }) };
    const rxLedger = {
      isConfigured: true,
      analyticsSnapshot: vi.fn().mockResolvedValue({
        data: { medications: [{ medication_id: "med-1", medication_name: "Exforge", days_until_stockout: 4, expiry_risk_quantity: 0 }], dispensed_medication_records: [{ patient_id: "not-forwarded" }] },
        meta: { source: "rxledger", generated_at: "2026-10-07T00:00:00.000Z", branch_ids: ["lagos"], date_range: { start_date: "2026-09-08", end_date: "2026-10-07" }, filters: { capabilities: ["inventory_analytics"] }, warnings: [] }
      })
    };
    const service = createRaiService({ provider, rxLedger });

    const result = await service.chat({
      message: "Which products will stock out soon?",
      context: { tenantId: "totalenergies", branchId: "lagos", role: "inventory", userId: "user-1", delegatedToken: "never-to-provider" }
    });

    expect(rxLedger.analyticsSnapshot).toHaveBeenCalled();
    expect(provider.chat.mock.calls[0][0].dataContext).toMatchObject({ source: "rxledger", at_risk_medications: [{ medication_name: "Exforge" }] });
    expect(JSON.stringify(provider.chat.mock.calls[0][0].dataContext)).not.toContain("not-forwarded");
    expect(JSON.stringify(provider.chat.mock.calls[0][0])).not.toContain("never-to-provider");
    expect(result.grounding.status).toBe("verified_data");
  });
});
