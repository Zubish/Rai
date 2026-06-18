// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRxLedgerAnalyticsDataSource,
  getRxLedgerConnectionStatus
} from "./rxledgerApiConnector";

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.RXLEDGER_API_BASE_URL;
const originalApiKey = process.env.RXLEDGER_API_KEY;
const originalPath = process.env.RXLEDGER_ANALYTICS_SNAPSHOT_PATH;

afterEach(() => {
  restoreEnv("RXLEDGER_API_BASE_URL", originalBaseUrl);
  restoreEnv("RXLEDGER_API_KEY", originalApiKey);
  restoreEnv("RXLEDGER_ANALYTICS_SNAPSHOT_PATH", originalPath);
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("RxLedger API connector", () => {
  it("reports unconfigured status without secrets", () => {
    delete process.env.RXLEDGER_API_BASE_URL;
    delete process.env.RXLEDGER_API_KEY;

    expect(getRxLedgerConnectionStatus()).toMatchObject({
      configured: false,
      snapshotPath: "/api/rai/analytics-snapshot"
    });
  });

  it("fetches a read-only analytics snapshot and maps RxLedger fields", async () => {
    process.env.RXLEDGER_API_BASE_URL = "https://rxledger.example";
    process.env.RXLEDGER_API_KEY = "test-token";
    process.env.RXLEDGER_ANALYTICS_SNAPSHOT_PATH = "/secure/rai/snapshot";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          medications: [
            {
              medication_id: "med-live-1",
              medication_name: "Live Drug",
              strength: "10mg",
              category: "Antihypertensive",
              current_stock: 120,
              average_monthly_usage: 60,
              cost_per_unit: 100,
              selling_price_per_unit: 250
            }
          ],
          dispensed_medication_records: [
            {
              transaction_id: "rx-live-1",
              patient_id: "patient-live-1",
              medication_id: "med-live-1",
              quantity_dispensed: 30,
              branch_id: "main",
              dispensed_at: "2026-06-10T08:00:00.000Z"
            }
          ]
        }
      })
    } as Response);

    const dataSource = await getRxLedgerAnalyticsDataSource({
      message: "Show live data",
      tenantId: "tenant-live",
      branchIds: ["main"]
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      new URL("/secure/rai/snapshot", "https://rxledger.example/"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token"
        })
      })
    );
    expect(dataSource?.sourceLabel).toBe("live RxLedger API");
    expect(dataSource?.medications[0]).toMatchObject({
      id: "med-live-1",
      name: "Live Drug",
      category: "antihypertensive",
      currentStock: 120
    });
    expect(dataSource?.dispensedMedicationRecords[0]).toMatchObject({
      transactionId: "rx-live-1",
      medicationId: "med-live-1",
      quantity: 30,
      dispensedAt: "2026-06-10"
    });
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
