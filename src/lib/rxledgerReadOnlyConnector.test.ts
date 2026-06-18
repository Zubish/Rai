import { describe, expect, it } from "vitest";
import { mockRxLedgerReadOnlyConnector } from "./rxledgerReadOnlyConnector";

describe("RxLedger read-only connector", () => {
  it("exposes medications without mutation commands", async () => {
    const medications = await mockRxLedgerReadOnlyConnector.listMedications();

    expect(medications.length).toBeGreaterThan(0);
    expect(Object.keys(mockRxLedgerReadOnlyConnector)).toEqual([
      "listMedications",
      "listDispenseRecords"
    ]);
  });

  it("filters dispense records by branch, medication, and date", async () => {
    const records = await mockRxLedgerReadOnlyConnector.listDispenseRecords({
      branchIds: ["main"],
      medicationIds: ["med-exforge-10-160"],
      startDate: "2026-03-01",
      endDate: "2026-03-31"
    });

    expect(records).toHaveLength(5);
    expect(new Set(records.map((record) => record.medicationId))).toEqual(
      new Set(["med-exforge-10-160"])
    );
  });
});
