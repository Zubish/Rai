import { describe, expect, it } from "vitest";
import { runRaiAnalytics } from "./analyticsEngine";
import { parseRaiQuestion } from "./intentParser";

async function ask(question: string) {
  const intent = parseRaiQuestion(question);
  return runRaiAnalytics(intent);
}

describe("runRaiAnalytics", () => {
  it("answers branch-scoped medication quantity sold questions", async () => {
    const intent = parseRaiQuestion(
      "From Lagos branch how many Aprovel was sold yesterday?",
      new Date("2026-06-19T05:00:00.000Z")
    );
    const report = await runRaiAnalytics(intent);

    expect(report.status).toBe("success");
    expect(report.toolName).toBe("get_medication_sales_quantity");
    expect(report.directAnswer).toContain("0 tablets of Aprovel 150mg");
    expect(report.assumptions).toContain("Branch scope: lagos.");
    expect(report.warnings).toContain("No matching dispensing records were found for this scope.");
  });

  it("deduplicates repeated Exforge purchases by patient ID", async () => {
    const report = await ask("How many unique patients are on Exforge 10/160 in March?");

    expect(report.status).toBe("success");
    expect(report.directAnswer).toContain("3 unique patients");
    expect(report.metricCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Unique patients", value: "3" }),
        expect.objectContaining({ label: "Transactions", value: "5" }),
        expect.objectContaining({ label: "Quantity dispensed", value: "150 tablets" })
      ])
    );
    expect(report.assumptions).toContain("Deduplicated by patient ID.");
  });

  it("answers medication category usage for antihypertensives", async () => {
    const report = await ask("Generate report on total antihypertensives dispensed in March");

    expect(report.status).toBe("success");
    expect(report.toolName).toBe("get_medication_category_usage");
    expect(report.directAnswer).toContain("390 tablets");
    expect(report.table.rows.length).toBeGreaterThanOrEqual(3);
  });

  it("answers sales and profit summary questions", async () => {
    const report = await ask("Show the most profitable antihypertensives last month");

    expect(report.status).toBe("success");
    expect(report.toolName).toBe("get_sales_profit_summary");
    expect(report.metricCards).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Gross profit", value: "₦164,500" })])
    );
  });

  it("calculates reorder forecast with assumptions", async () => {
    const report = await ask("What should I reorder for Aprovel for seven months?");

    expect(report.status).toBe("success");
    expect(report.toolName).toBe("get_reorder_forecast");
    expect(report.directAnswer).toContain("recommend reordering 3,240 tablets");
    expect(report.assumptions).toContain("Forecast horizon: 7 months.");
  });

  it("surfaces risk reports for stockout, expiry, and slow-moving stock", async () => {
    const stockout = await ask("Which medications are likely to stock out soon?");
    const expiry = await ask("Show expiry risk");
    const slow = await ask("Which products are slow moving?");

    expect(stockout.toolName).toBe("get_stockout_risk");
    expect(expiry.toolName).toBe("get_expiry_risk");
    expect(slow.toolName).toBe("get_slow_moving_stock");
    expect(stockout.table.rows[0]).toHaveProperty("risk");
    expect(expiry.table.rows[0]).toHaveProperty("expiryDate");
    expect(slow.table.rows[0]).toHaveProperty("stockValue");
  });

  it("does not invent an answer for unsupported requests", async () => {
    const report = await ask("Change Aprovel stock");

    expect(report.status).toBe("unsupported");
    expect(report.directAnswer).toContain("Rai cannot run that request");
    expect(report.metricCards).toEqual([]);
  });

  it("maps broad continuity questions to required RxLedger data instead of guessing", async () => {
    const report = await ask(
      "Which drugs do we frequently have in continuity but we don't buy so often that are worth keeping?"
    );

    expect(report.status).toBe("unsupported");
    expect(report.toolName).toBe("answer_rxledger_question");
    expect(report.title).toBe("Continuity demand gap");
    expect(report.directAnswer).toContain("Rai understands this as a continuity demand gap question");
    expect(report.table.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requiredData: "continuity or owed medication records" }),
        expect.objectContaining({ requiredData: "purchase history" })
      ])
    );
    expect(report.warnings[0]).toContain("required read-only analytics data");
  });

  it("maps approval and payment questions to the missing RxLedger API contract", async () => {
    const report = await ask("How many approval sales did Lagos branch process yesterday?");

    expect(report.status).toBe("unsupported");
    expect(report.toolName).toBe("answer_rxledger_question");
    expect(report.title).toBe("Approval and payment analysis");
    expect(report.table.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requiredData: "approval records" }),
        expect.objectContaining({ requiredData: "payment method" })
      ])
    );
  });
});
