import type { RaiIntentName } from "./types.js";

export type RaiToolName =
  | "get_unique_patients_on_medication"
  | "get_medication_sales_quantity"
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
  | "summarize_business_health"
  | "answer_rxledger_question";

export type RaiCapability = {
  id: string;
  label: string;
  toolName: RaiToolName;
  intentName?: RaiIntentName;
  supported: boolean;
  description: string;
  triggerTerms: string[];
  requiredData: string[];
  recommendedApiCapabilities: string[];
};

export const raiCapabilities: RaiCapability[] = [
  supportedCapability({
    id: "medication-sales-quantity",
    label: "Medication sales quantity",
    toolName: "get_medication_sales_quantity",
    intentName: "medication_sales_quantity",
    description: "Calculate quantity sold or dispensed for a named medicine, branch, and date range.",
    triggerTerms: ["how many", "quantity", "sold", "sales", "dispensed", "issued", "given"],
    requiredData: ["dispensing records", "medication catalog", "branch id", "date range"]
  }),
  supportedCapability({
    id: "unique-patient-medication-demand",
    label: "Unique patient medication demand",
    toolName: "get_unique_patients_on_medication",
    intentName: "unique_patients_on_medication",
    description: "Count unique patients on a named medicine without double-counting repeat transactions.",
    triggerTerms: ["unique patient", "patient count", "how many patients", "repeat patients"],
    requiredData: ["dispensing records", "stable patient id", "medication catalog", "date range"]
  }),
  supportedCapability({
    id: "category-usage",
    label: "Medication category usage",
    toolName: "get_medication_category_usage",
    intentName: "medication_category_usage",
    description: "Summarize usage, revenue, and gross profit by medication category.",
    triggerTerms: ["category", "class", "antihypertensive", "dispensed by category"],
    requiredData: ["medication category", "dispensing records", "unit price", "unit cost"]
  }),
  supportedCapability({
    id: "profit-summary",
    label: "Sales and profit summary",
    toolName: "get_sales_profit_summary",
    intentName: "sales_profit_summary",
    description: "Rank products by revenue, gross profit, and margin.",
    triggerTerms: ["profit", "profitable", "margin", "top performing", "revenue"],
    requiredData: ["dispensing records", "unit price", "unit cost", "medication catalog"]
  }),
  supportedCapability({
    id: "reorder-forecast",
    label: "Reorder forecasting",
    toolName: "get_reorder_forecast",
    intentName: "reorder_forecast",
    description: "Recommend reorder quantities using demand, stock, owed quantity, and safety buffer.",
    triggerTerms: ["reorder", "restock", "what should i buy", "buy more", "purchase plan"],
    requiredData: ["current stock", "average usage", "owed quantity", "lead time", "date range"]
  }),
  supportedCapability({
    id: "stockout-risk",
    label: "Stockout risk",
    toolName: "get_stockout_risk",
    intentName: "stockout_risk",
    description: "Identify items likely to run out soon.",
    triggerTerms: ["stockout", "stock out", "run out", "low stock", "days of cover"],
    requiredData: ["current stock", "average usage", "supplier lead time"]
  }),
  supportedCapability({
    id: "expiry-risk",
    label: "Expiry risk",
    toolName: "get_expiry_risk",
    intentName: "expiry_risk",
    description: "Identify products with expiry exposure.",
    triggerTerms: ["expiry", "expire", "near expiry", "expired"],
    requiredData: ["batch expiry date", "quantity at risk", "current stock"]
  }),
  supportedCapability({
    id: "slow-moving-stock",
    label: "Slow-moving stock",
    toolName: "get_slow_moving_stock",
    intentName: "slow_moving_stock",
    description: "Identify products tying down cash because movement is weak.",
    triggerTerms: ["slow moving", "slow-moving", "dead stock", "not moving"],
    requiredData: ["last sale date", "current stock", "unit cost"]
  }),
  supportedCapability({
    id: "restock-budget-plan",
    label: "Restock budget planning",
    toolName: "build_restock_budget_plan",
    intentName: "budget_restock_plan",
    description: "Allocate a restock budget across products to protect availability and profit.",
    triggerTerms: ["budget", "naira", "ngn", "spend", "allocate"],
    requiredData: ["budget", "current stock", "unit cost", "usage", "margin", "lead time"]
  }),
  supportedCapability({
    id: "demand-forecast",
    label: "Demand forecasting",
    toolName: "forecast_category_demand",
    intentName: "demand_forecast",
    description: "Forecast category or product demand over a planning window.",
    triggerTerms: ["forecast", "predict", "demand", "next month", "next week"],
    requiredData: ["historical sales", "usage trend", "category", "date range"]
  }),
  supportedCapability({
    id: "profit-levers",
    label: "Profit maximization",
    toolName: "find_profit_maximization_levers",
    intentName: "profit_maximization",
    description: "Find practical levers for improving pharmacy profit.",
    triggerTerms: ["maximize profit", "maximise profit", "improve profit", "make more money", "increase margin"],
    requiredData: ["sales", "margin", "current stock", "availability risk"]
  }),
  supportedCapability({
    id: "cash-tied-inventory",
    label: "Cash tied in inventory",
    toolName: "find_cash_tied_in_inventory",
    intentName: "cash_tied_inventory",
    description: "Identify inventory that traps working capital.",
    triggerTerms: ["cash tied", "capital tied", "tied down", "working capital", "dead cash"],
    requiredData: ["current stock", "unit cost", "last sale date", "expiry exposure"]
  }),
  supportedCapability({
    id: "business-health",
    label: "Business health review",
    toolName: "summarize_business_health",
    intentName: "business_health_review",
    description: "Summarize pharmacy performance across profit, availability, expiry, and capital risk.",
    triggerTerms: ["business health", "health review", "owner summary", "executive summary", "performance summary"],
    requiredData: ["sales", "profit", "stockout risk", "expiry risk", "working capital"]
  }),
  pendingCapability({
    id: "continuity-demand-gap",
    label: "Continuity demand gap",
    description: "Find medicines frequently requested in continuity or owed queues but rarely purchased or stocked.",
    triggerTerms: ["continuity", "owed", "pending", "unavailable", "rarely stock", "rarely buy", "patients ask"],
    requiredData: [
      "continuity or owed medication records",
      "current stock",
      "purchase history",
      "sales conversion",
      "profit margin",
      "expiry risk"
    ],
    recommendedApiCapabilities: [
      "continuity demand summary",
      "purchase/restock history by medication",
      "unavailable-to-sale conversion",
      "minimum stock recommendation"
    ]
  }),
  pendingCapability({
    id: "purchase-history",
    label: "Purchase and supplier history",
    description: "Analyze what the pharmacy buys, how often it buys, supplier lead time, and purchase value.",
    triggerTerms: ["purchase history", "bought", "buy often", "supplier", "vendor", "invoice", "procurement"],
    requiredData: ["purchase orders", "supplier invoices", "receiving records", "supplier lead time"],
    recommendedApiCapabilities: ["purchase history summary", "supplier performance", "restock frequency"]
  }),
  pendingCapability({
    id: "approval-and-payment-analysis",
    label: "Approval and payment analysis",
    description: "Analyze approvals, credit sales, HMO approvals, cash sales, and payment status.",
    triggerTerms: ["approval", "approved", "cash sale", "credit", "hmo", "payment status", "paid"],
    requiredData: ["approval records", "payment method", "settlement status", "transaction status"],
    recommendedApiCapabilities: ["approval sales summary", "payment-method breakdown", "HMO settlement aging"]
  }),
  pendingCapability({
    id: "staff-performance",
    label: "Staff performance",
    description: "Compare staff activity, dispensing volume, sales value, and workflow completion.",
    triggerTerms: ["staff", "pharmacist", "cashier", "operator", "who processed", "employee"],
    requiredData: ["user id", "role", "transaction audit events", "dispensing events", "shift or date scope"],
    recommendedApiCapabilities: ["staff activity summary", "dispensing audit summary", "role-aware performance metrics"]
  }),
  pendingCapability({
    id: "patient-refill-follow-up",
    label: "Patient refill and follow-up",
    description: "Find patients due for refill, overdue follow-up, or repeated medication needs.",
    triggerTerms: ["refill", "follow up", "overdue", "returned for", "patient retention", "repeat medication"],
    requiredData: ["patient medication history", "last dispense date", "days supply", "follow-up status"],
    recommendedApiCapabilities: ["refill due list", "overdue follow-up summary", "patient repeat-medication cohort"]
  }),
  pendingCapability({
    id: "branch-comparison",
    label: "Branch comparison",
    description: "Compare sales, stock, expiry, demand, and profit across branches.",
    triggerTerms: ["compare branches", "which branch", "lagos vs", "branch performance", "branch comparison"],
    requiredData: ["branch id", "sales by branch", "stock by branch", "profit by branch"],
    recommendedApiCapabilities: ["branch performance summary", "branch stock risk comparison"]
  })
];

export function matchRaiCapability(question: string): RaiCapability | null {
  const lower = question.toLowerCase();
  const scored = raiCapabilities
    .map((capability) => {
      const baseScore = capability.triggerTerms.reduce(
        (total, term) => total + (lower.includes(term) ? term.length : 0),
        0
      );

      return {
        capability,
        score: baseScore > 0 ? baseScore + (capability.supported ? 0 : 100) : 0
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.capability ?? null;
}

export function getRaiCapabilityByToolName(toolName: string): RaiCapability | null {
  return raiCapabilities.find((capability) => capability.toolName === toolName) ?? null;
}

export function getRaiCapabilityByIntentName(intentName: RaiIntentName): RaiCapability | null {
  return raiCapabilities.find((capability) => capability.intentName === intentName) ?? null;
}

function supportedCapability(input: Omit<RaiCapability, "supported" | "recommendedApiCapabilities">): RaiCapability {
  return {
    ...input,
    supported: true,
    recommendedApiCapabilities: []
  };
}

function pendingCapability(input: Omit<RaiCapability, "supported" | "toolName" | "intentName">): RaiCapability {
  return {
    ...input,
    toolName: "answer_rxledger_question",
    supported: false
  };
}
