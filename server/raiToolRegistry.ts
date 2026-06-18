import { runRaiAnalytics, type RaiAnalyticsDataSource } from "../src/lib/analyticsEngine.js";
import { parseRaiQuestion } from "../src/lib/intentParser.js";
import type { RaiDateRange, RaiIntent, RaiReport } from "../src/lib/types.js";

type RaiToolName =
  | "get_unique_patients_on_medication"
  | "get_medication_category_usage"
  | "get_sales_profit_summary"
  | "get_reorder_forecast"
  | "get_stockout_risk"
  | "get_expiry_risk"
  | "get_slow_moving_stock"
  | "build_restock_budget_plan"
  | "forecast_category_demand"
  | "find_profit_maximization_levers"
  | "find_cash_tied_in_inventory"
  | "summarize_business_health";

export type RaiToolCallArgs = {
  question?: string;
  medicationQuery?: string;
  category?: string;
  budgetNaira?: number;
  forecastMonths?: number;
  horizonDays?: number;
};

const defaultDateRange: RaiDateRange = {
  startDate: "2026-01-01",
  endDate: "2026-06-18",
  label: "All available 2026 data"
};

const mainBranch = ["main"];

export const raiOpenAiTools = [
  tool(
    "get_unique_patients_on_medication",
    "Count unique patients on a named medication, deduplicated by patient ID."
  ),
  tool("get_medication_category_usage", "Summarize medication category usage, revenue, and gross profit."),
  tool("get_sales_profit_summary", "Rank medicines by sales, gross profit, and margin."),
  tool("get_reorder_forecast", "Calculate reorder quantity from demand, stock, owed quantity, and safety buffer."),
  tool("get_stockout_risk", "Rank medicines by likely stockout risk."),
  tool("get_expiry_risk", "Identify medicines with expiry exposure."),
  tool("get_slow_moving_stock", "Identify products tying down cash through weak movement."),
  tool("build_restock_budget_plan", "Allocate a fixed restock budget to protect availability and profit."),
  tool("forecast_category_demand", "Forecast medicine category demand over a planning window."),
  tool("find_profit_maximization_levers", "Find practical profit improvement actions."),
  tool("find_cash_tied_in_inventory", "Find cash tied down in inventory."),
  tool("summarize_business_health", "Summarize owner-level pharmacy business health.")
] as const;

export async function executeRaiTool(
  name: string,
  args: RaiToolCallArgs,
  dataSource?: RaiAnalyticsDataSource
): Promise<RaiReport> {
  if (!isRaiToolName(name)) {
    return runRaiAnalytics({
      intent: "unsupported",
      reason: `Rai does not have an approved tool named ${name}.`
    }, dataSource);
  }

  const question = args.question?.trim();
  const parsed = question ? parseRaiQuestion(question) : null;
  if (parsed && parsed.intent !== "unsupported" && toolMatchesIntent(name, parsed.intent)) {
    return runRaiAnalytics(parsed, dataSource);
  }

  return runRaiAnalytics(intentForTool(name, args, question ?? ""), dataSource);
}

function tool(name: RaiToolName, description: string) {
  return {
    type: "function",
    name,
    description,
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        question: {
          type: ["string", "null"],
          description: "The user's original pharmacy business question."
        },
        medicationQuery: {
          type: ["string", "null"],
          description: "Medication name and strength if the question is about a specific medicine."
        },
        category: {
          type: ["string", "null"],
          description: "Medication or business category, such as antihypertensive."
        },
        budgetNaira: {
          type: ["number", "null"],
          description: "Available restock budget in Nigerian naira."
        },
        forecastMonths: {
          type: ["number", "null"],
          description: "Forecast horizon in months where relevant."
        },
        horizonDays: {
          type: ["number", "null"],
          description: "Forecast horizon in days where relevant."
        }
      },
      required: ["question", "medicationQuery", "category", "budgetNaira", "forecastMonths", "horizonDays"]
    }
  };
}

function intentForTool(name: RaiToolName, args: RaiToolCallArgs, question: string): RaiIntent {
  switch (name) {
    case "get_unique_patients_on_medication":
      return {
        intent: "unique_patients_on_medication",
        medicationQuery: args.medicationQuery || medicationFromQuestion(question) || "Exforge 10/160",
        dateRange: defaultDateRange,
        branchIds: mainBranch,
        deduplicateBy: "patient_id",
        matchStrength: true
      };
    case "get_medication_category_usage":
      return {
        intent: "medication_category_usage",
        category: args.category || categoryFromQuestion(question),
        dateRange: defaultDateRange,
        branchIds: mainBranch
      };
    case "get_sales_profit_summary":
      return {
        intent: "sales_profit_summary",
        category: args.category || categoryFromQuestion(question),
        dateRange: defaultDateRange,
        branchIds: mainBranch,
        sortBy: "grossProfit"
      };
    case "get_reorder_forecast":
      return {
        intent: "reorder_forecast",
        medicationQuery: args.medicationQuery || medicationFromQuestion(question) || "Aprovel",
        forecastMonths: args.forecastMonths || (question.includes("seven") ? 7 : 3),
        supplyMonthsPerPatient: 3,
        safetyStockPercent: 10,
        dateRange: defaultDateRange,
        branchIds: mainBranch
      };
    case "get_stockout_risk":
      return { intent: "stockout_risk", dateRange: defaultDateRange, branchIds: mainBranch };
    case "get_expiry_risk":
      return { intent: "expiry_risk", dateRange: defaultDateRange, branchIds: mainBranch };
    case "get_slow_moving_stock":
      return { intent: "slow_moving_stock", dateRange: defaultDateRange, branchIds: mainBranch };
    case "build_restock_budget_plan":
      return {
        intent: "budget_restock_plan",
        budgetNaira: args.budgetNaira || budgetFromQuestion(question) || 500000,
        objective: "maximize_profit_and_availability",
        dateRange: defaultDateRange,
        branchIds: mainBranch
      };
    case "forecast_category_demand":
      return {
        intent: "demand_forecast",
        category: args.category || categoryFromQuestion(question),
        horizonDays: args.horizonDays || (question.includes("90") ? 90 : 60),
        dateRange: defaultDateRange,
        branchIds: mainBranch
      };
    case "find_profit_maximization_levers":
      return { intent: "profit_maximization", dateRange: defaultDateRange, branchIds: mainBranch };
    case "find_cash_tied_in_inventory":
      return { intent: "cash_tied_inventory", dateRange: defaultDateRange, branchIds: mainBranch };
    case "summarize_business_health":
      return { intent: "business_health_review", dateRange: defaultDateRange, branchIds: mainBranch };
  }
}

function isRaiToolName(name: string): name is RaiToolName {
  return raiOpenAiTools.some((toolDefinition) => toolDefinition.name === name);
}

function toolMatchesIntent(name: RaiToolName, intent: RaiIntent["intent"]): boolean {
  const mapping: Record<RaiToolName, RaiIntent["intent"]> = {
    get_unique_patients_on_medication: "unique_patients_on_medication",
    get_medication_category_usage: "medication_category_usage",
    get_sales_profit_summary: "sales_profit_summary",
    get_reorder_forecast: "reorder_forecast",
    get_stockout_risk: "stockout_risk",
    get_expiry_risk: "expiry_risk",
    get_slow_moving_stock: "slow_moving_stock",
    build_restock_budget_plan: "budget_restock_plan",
    forecast_category_demand: "demand_forecast",
    find_profit_maximization_levers: "profit_maximization",
    find_cash_tied_in_inventory: "cash_tied_inventory",
    summarize_business_health: "business_health_review"
  };

  return mapping[name] === intent;
}

function medicationFromQuestion(question: string): string | null {
  const known = ["Exforge 10/160", "Aprovel", "Amlodipine 5mg", "Amaryl 2mg"];
  return known.find((medication) => question.toLowerCase().includes(medication.toLowerCase())) ?? null;
}

function categoryFromQuestion(question: string): string {
  return question.toLowerCase().includes("antihypertensive") ? "antihypertensive" : "all";
}

function budgetFromQuestion(question: string): number | null {
  const match = question.match(/(?:₦|ngn|naira)?\s*([0-9][0-9,.]*)\s*(k|m|million|thousand)?/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(amount)) {
    return null;
  }

  const suffix = match[2]?.toLowerCase();
  if (suffix === "m" || suffix === "million") {
    return amount * 1_000_000;
  }
  if (suffix === "k" || suffix === "thousand") {
    return amount * 1_000;
  }
  return amount;
}
