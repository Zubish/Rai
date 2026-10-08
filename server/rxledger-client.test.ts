import { describe, expect, it, vi } from "vitest";
import { capabilitiesForQuestion, compactAnalyticsContext, createRxLedgerClient } from "./rxledger-client.mjs";

describe("RxLedger Rai client", () => {
  it('does not turn ordinary conversation into an inventory query', () => {
    expect(capabilitiesForQuestion('How are you?')).toEqual([]);
  });
  it('preserves healthy-stock and permitted financial inputs, not just risk rows', () => {
    const context = compactAnalyticsContext({ data: { medications: [{ medication_id: 'healthy', medication_name: 'Aprovel', current_stock: 120, days_until_stockout: 60, expiry_risk_quantity: 0, cost_per_unit: 20, patient_id: 'private' }] }, meta: { source: 'rxledger', filters: { capabilities: ['inventory_analytics', 'financial_analytics'] } } });
    expect(context.medications).toMatchObject([{ medication_name: 'Aprovel', current_stock: 120, cost_per_unit: 20 }]);
    expect(context.at_risk_medications).toHaveLength(0);
    expect(JSON.stringify(context)).not.toContain('private');
    expect(context.inventory_summary).toMatchObject({ stocked_record_count: 1, stockout_risk_record_count: 0 });
  });
  it("refuses a service-key-only request before making a network call", async () => {
    const fetchImpl = vi.fn();
    const client = createRxLedgerClient({ baseUrl: "https://rxledger.example", apiKey: "test", fetchImpl });
    await expect(client.analyticsSnapshot({ context: { tenantId: "demo", branchId: "lagos", userId: "admin" } })).rejects.toMatchObject({ status: 401 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects a snapshot belonging to another tenant", async () => {
    const client = createRxLedgerClient({ baseUrl: "https://rxledger.example", apiKey: "test", fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {}, meta: { source: "rxledger", tenant_id: "other" } }) }) });
    await expect(client.analyticsSnapshot({ context: { tenantId: "expected", branchId: "lagos", userId: "user", delegatedToken: "test" }, capabilities: ["inventory_analytics"], startDate: "2026-10-01", endDate: "2026-10-07" })).rejects.toMatchObject({ code: "invalid_snapshot_scope" });
  });
  it("requests a tenant, branch, user and least-privilege capability scope", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { medications: [], dispensed_medication_records: [] }, meta: { source: "rxledger", tenant_id: "totalenergies", branch_ids: ["lagos"], date_range: { start_date: "2026-09-01", end_date: "2026-09-30" }, filters: { capabilities: ["inventory_analytics"] } } })
    });
    const client = createRxLedgerClient({ baseUrl: "https://rxledger.example", apiKey: "test-key", fetchImpl });

    await client.analyticsSnapshot({
      context: { tenantId: "totalenergies", branchId: "lagos", userId: "user-1", delegatedToken: "test-grant" },
      capabilities: ["inventory_analytics"],
      startDate: "2026-09-01",
      endDate: "2026-09-30"
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://rxledger.example/api/rai/analytics-snapshot", expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer test-key", "x-rai-delegated-token": "test-grant" }) }));
    expect(fetchImpl.mock.calls[0][1].headers).not.toHaveProperty("x-rai-user-session");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ tenant_id: "totalenergies", actor_id: "user-1", branch_ids: ["lagos"], capabilities: ["inventory_analytics"] });
  });

  it("maps questions to the smallest useful capability set", () => {
    expect(capabilitiesForQuestion("Which items will stock out next week?")).toEqual(["inventory_analytics"]);
    expect(capabilitiesForQuestion("What is our profit margin by product?")).toEqual(expect.arrayContaining(["inventory_analytics", "financial_analytics"]));
  });

  it("strips patient-level records before sending a reduced snapshot to a model", () => {
    const context = compactAnalyticsContext({
      data: { medications: [{ medication_id: "med-1", medication_name: "Exforge", days_until_stockout: 4, expiry_risk_quantity: 0, patient_id: "must-not-pass" }], dispensed_medication_records: [{ patient_id: "patient_hash" }] },
      meta: { source: "rxledger", generated_at: "2026-10-07T00:00:00.000Z", branch_ids: ["lagos"], date_range: { start_date: "2026-10-01", end_date: "2026-10-07" }, filters: { capabilities: ["inventory_analytics"] }, warnings: [] }
    });

    expect(JSON.stringify(context)).not.toContain("patient_hash");
    expect(context.at_risk_medications).toHaveLength(1);
  });
});
