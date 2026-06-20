// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { executeRaiTool, raiOpenAiTools } from "./raiToolRegistry";

const originalServiceUrl = process.env.RAI_ANALYTICS_SERVICE_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalServiceUrl === undefined) delete process.env.RAI_ANALYTICS_SERVICE_URL;
  else process.env.RAI_ANALYTICS_SERVICE_URL = originalServiceUrl;
  vi.restoreAllMocks();
});

describe("Rai tool registry", () => {
  it("defines strict OpenAI function tools", () => {
    expect(raiOpenAiTools.length).toBeGreaterThan(10);
    expect(raiOpenAiTools.every((tool) => tool.type === "function")).toBe(true);
    expect(raiOpenAiTools.every((tool) => tool.strict === true)).toBe(true);
  });

  it("executes every approved tool through deterministic analytics", async () => {
    const reports = await Promise.all(
      raiOpenAiTools.map((tool) =>
        executeRaiTool(tool.name, {
          question:
            tool.name === "answer_rxledger_question"
              ? "Which drugs are frequently in continuity but rarely purchased?"
              : "Give me a safe pharmacy business answer",
          medicationQuery: "Aprovel",
          category: "antihypertensive",
          budgetNaira: 500000,
          forecastMonths: 7,
          horizonDays: 90
        })
      )
    );

    const genericRouterReport = reports.find((report) => report.toolName === "answer_rxledger_question");
    const deterministicReports = reports.filter((report) => report.toolName !== "answer_rxledger_question");

    expect(deterministicReports.every((report) => report.status === "success")).toBe(true);
    expect(genericRouterReport?.status).toBe("unsupported");
    expect(new Set(reports.map((report) => report.toolName)).size).toBe(raiOpenAiTools.length);
  });

  it("uses parser-matched questions when they align with the selected tool", async () => {
    const report = await executeRaiTool("find_cash_tied_in_inventory", {
      question: "Where is cash tied down in stock?"
    });

    expect(report.id).toBe("cash-tied-inventory");
    expect(report.directAnswer).toContain("₦96,600");
  });

  it("extracts budget suffixes and defaults from tool questions", async () => {
    const millionBudget = await executeRaiTool("build_restock_budget_plan", {
      question: "I have 1m budget, what should I buy?"
    });
    expect(millionBudget.directAnswer).toContain("₦1,000,000");

    const thousandBudget = await executeRaiTool("build_restock_budget_plan", {
      question: "I have 750k budget, what should I buy?"
    });
    expect(thousandBudget.directAnswer).toContain("₦750,000");

    const defaultBudget = await executeRaiTool("build_restock_budget_plan", {
      question: "What should I buy?"
    });
    expect(defaultBudget.directAnswer).toContain("₦500,000");
  });

  it("falls back to all categories when no category is named", async () => {
    const report = await executeRaiTool("forecast_category_demand", {
      question: "Forecast demand for the next 30 days",
      horizonDays: 30
    });

    expect(report.toolName).toBe("forecast_category_demand");
    expect(report.title).toBe("All demand forecast");
  });

  it("uses the Python analytics service for demand history when configured", async () => {
    process.env.RAI_ANALYTICS_SERVICE_URL = "http://127.0.0.1:8790";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: "linear_trend",
        horizonDays: 2,
        forecast: [
          { date: "2026-06-03", value: 12 },
          { date: "2026-06-04", value: 14 }
        ],
        totalForecast: 26,
        backtest: { mae: 1, observations: 2 },
        warnings: ["Directional forecast"]
      })
    } as Response);

    const report = await executeRaiTool(
      "forecast_category_demand",
      { question: "Forecast antihypertensive demand for 2 days", category: "antihypertensive", horizonDays: 2 },
      {
        medications: [
          {
            id: "med-1", name: "Aprovel", strength: "150mg", category: "antihypertensive",
            unit: "tablets", costPerUnit: 1, sellingPricePerUnit: 2, currentStock: 10,
            averageMonthlyUsage: 10, pendingOwedQuantity: 0, supplierLeadTimeDays: 2,
            expiryRiskQuantity: 0, daysUntilStockout: 30, daysSinceLastSale: 1, stockValue: 10
          }
        ],
        dispensedMedicationRecords: [
          { transactionId: "1", patientId: "p1", medicationId: "med-1", quantity: 10, branchId: "main", dispensedAt: "2026-06-01", voided: false, returned: false },
          { transactionId: "2", patientId: "p2", medicationId: "med-1", quantity: 11, branchId: "main", dispensedAt: "2026-06-02", voided: false, returned: false }
        ],
        sourceLabel: "RxLedger test aggregate"
      }
    );

    expect(report.directAnswer).toContain("26 tablets");
    expect(report.assumptions).toContain("Forecast model: linear_trend.");
    expect(report.warnings).toContain("Directional forecast");
  });

  it("routes broad RxLedger questions through the generic capability tool", async () => {
    const report = await executeRaiTool("answer_rxledger_question", {
      question: "Which staff processed the most approvals last week?"
    });

    expect(report.status).toBe("unsupported");
    expect(report.toolName).toBe("answer_rxledger_question");
    expect(report.title).toBe("Approval and payment analysis");
    expect(report.suggestedActions).toEqual(
      expect.arrayContaining([
        "Use this capability mapping as the API contract for the next RxLedger integration slice."
      ])
    );
  });
});
