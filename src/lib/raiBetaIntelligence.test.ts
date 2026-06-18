import { describe, expect, it } from "vitest";
import { runRaiAnalytics } from "./analyticsEngine";
import { parseRaiQuestion } from "./intentParser";

async function answer(question: string) {
  return runRaiAnalytics(parseRaiQuestion(question));
}

describe("Rai beta business intelligence", () => {
  it("creates a constrained restock budget plan that prioritizes profit and stockout risk", async () => {
    const report = await answer("I have ₦500,000 budget, what should I buy to maximize profit and avoid stockout?");

    expect(report.id).toBe("budget-restock-plan");
    expect(report.toolName).toBe("build_restock_budget_plan");
    expect(report.directAnswer).toContain("₦500,000");
    expect(report.directAnswer).toContain("Amlodipine");
    expect(report.table.rows[0].medication).toContain("Amlodipine");
    expect(report.metricCards.map((card) => card.label)).toContain("Expected gross profit");
  });

  it("forecasts category demand over a 90 day planning window", async () => {
    const report = await answer("Forecast demand for antihypertensives for 90 days");

    expect(report.id).toBe("demand-forecast");
    expect(report.toolName).toBe("forecast_category_demand");
    expect(report.directAnswer).toContain("2,790 tablets");
    expect(report.metricCards.find((card) => card.label === "Forecast horizon")?.value).toBe("90 days");
  });

  it("identifies practical profit maximisation levers", async () => {
    const report = await answer("How do I improve profit this month?");

    expect(report.id).toBe("profit-maximization");
    expect(report.toolName).toBe("find_profit_maximization_levers");
    expect(report.directAnswer).toContain("Amlodipine");
    expect(report.suggestedActions.length).toBeGreaterThanOrEqual(3);
  });

  it("finds cash tied down in inventory", async () => {
    const report = await answer("Where is cash tied down in stock?");

    expect(report.id).toBe("cash-tied-inventory");
    expect(report.toolName).toBe("find_cash_tied_in_inventory");
    expect(report.directAnswer).toContain("₦96,600");
    expect(report.table.rows.map((row) => row.medication)).toContain("CoughClear Syrup 100ml");
  });

  it("summarizes business health for the pharmacy owner", async () => {
    const report = await answer("Give me a business health review");

    expect(report.id).toBe("business-health-review");
    expect(report.toolName).toBe("summarize_business_health");
    expect(report.metricCards.map((card) => card.label)).toEqual(
      expect.arrayContaining(["Gross profit", "Cash at risk", "Items needing action"])
    );
    expect(report.warnings.length).toBeGreaterThan(0);
  });
});
