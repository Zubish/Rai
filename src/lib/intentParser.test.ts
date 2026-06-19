import { describe, expect, it } from "vitest";
import { parseRaiQuestion } from "./intentParser";

describe("parseRaiQuestion", () => {
  it.each([
    [
      "How many unique patients are on Exforge 10/160 in March?",
      "unique_patients_on_medication"
    ],
    ["Generate report on total antihypertensives dispensed in March", "medication_category_usage"],
    ["From Lagos branch how many Aprovel was sold yesterday?", "medication_sales_quantity"],
    ["Show the most profitable antihypertensives last month", "sales_profit_summary"],
    ["What should I reorder for Aprovel for seven months?", "reorder_forecast"],
    ["Which medications are likely to stock out soon?", "stockout_risk"],
    ["Show expiry risk", "expiry_risk"],
    ["Which products are slow moving?", "slow_moving_stock"]
  ])("maps '%s' to %s", (question, expectedIntent) => {
    expect(parseRaiQuestion(question).intent).toBe(expectedIntent);
  });

  it("extracts medication, date range, and deduplication rules for unique patient questions", () => {
    const intent = parseRaiQuestion(
      "Without repetition get me the number of patients on Amaryl 2mg"
    );

    expect(intent.intent).toBe("unique_patients_on_medication");
    if (intent.intent !== "unique_patients_on_medication") {
      throw new Error("Expected unique patient medication intent");
    }

    expect(intent.medicationQuery).toBe("Amaryl 2mg");
    expect(intent.deduplicateBy).toBe("patient_id");
    expect(intent.matchStrength).toBe(true);
  });

  it("extracts branch and date scope for medication quantity sold questions", () => {
    const intent = parseRaiQuestion(
      "From Lagos branch how many Aprovel was sold yesterday?",
      new Date("2026-06-19T05:00:00.000Z")
    );

    expect(intent.intent).toBe("medication_sales_quantity");
    if (intent.intent !== "medication_sales_quantity") {
      throw new Error("Expected medication quantity sold intent");
    }

    expect(intent.medicationQuery).toBe("Aprovel");
    expect(intent.branchIds).toEqual(["lagos"]);
    expect(intent.dateRange.startDate).toBe("2026-06-18");
    expect(intent.dateRange.endDate).toBe("2026-06-18");
  });

  it("rejects write requests with a read-only analytics reason", () => {
    const intent = parseRaiQuestion("Change the selling price of Aprovel");

    expect(intent.intent).toBe("unsupported");
    if (intent.intent !== "unsupported") {
      throw new Error("Expected unsupported intent");
    }
    expect(intent.reason).toContain("read-only analytics");
  });

  it("does not map a plain greeting to a random RxLedger capability", () => {
    const intent = parseRaiQuestion("hi");

    expect(intent.intent).toBe("unsupported");
    if (intent.intent !== "unsupported") {
      throw new Error("Expected unsupported greeting intent");
    }
    expect(intent.reason).not.toContain("Continuity");
  });
});
