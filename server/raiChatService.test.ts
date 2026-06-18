// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { runRaiChat } from "./raiChatService";
import { executeRaiTool } from "./raiToolRegistry";

const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  restoreEnv("OPENAI_API_KEY", originalApiKey);
});

describe("Rai chat backend", () => {
  it("keeps Rai functional through deterministic tools when OpenAI is not configured", async () => {
    process.env.OPENAI_API_KEY = "";

    const response = await runRaiChat({
      message: "I have ₦500,000 budget, what should I buy to maximize profit and avoid stockout?"
    });

    expect(response.orchestrationMode).toBe("deterministic_fallback");
    expect(response.report.toolName).toBe("build_restock_budget_plan");
    expect(response.report.directAnswer).toContain("Amlodipine");
  });

  it("executes approved Rai tools as deterministic source of truth", async () => {
    const report = await executeRaiTool("forecast_category_demand", {
      question: "Forecast demand for antihypertensives for 90 days",
      category: "antihypertensive",
      horizonDays: 90
    });

    expect(report.status).toBe("success");
    expect(report.toolName).toBe("forecast_category_demand");
    expect(report.directAnswer).toContain("2,790 tablets");
  });

  it("maps tool arguments to medication-specific reorder analytics", async () => {
    const report = await executeRaiTool("get_reorder_forecast", {
      medicationQuery: "Aprovel",
      forecastMonths: 7
    });

    expect(report.toolName).toBe("get_reorder_forecast");
    expect(report.directAnswer).toContain("3,240 tablets");
  });

  it("maps advisory tools without relying on the parser", async () => {
    const report = await executeRaiTool("summarize_business_health", {});

    expect(report.toolName).toBe("summarize_business_health");
    expect(report.id).toBe("business-health-review");
  });

  it("blocks unknown tools", async () => {
    const report = await executeRaiTool("delete_inventory", {
      question: "Delete slow moving stock"
    });

    expect(report.status).toBe("unsupported");
    expect(report.toolName).toBe("no_tool_called");
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
