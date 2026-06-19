import type { RaiIntent } from "./types.js";
import { matchRaiCapability } from "./raiCapabilities.js";
import { parseRaiQuestionScope } from "./raiScope.js";

const KNOWN_MEDICATIONS = ["Exforge 10/160", "Amaryl 2mg", "Aprovel"];

export function parseRaiQuestion(question: string, now?: Date): RaiIntent {
  const normalized = question.trim();
  const lower = normalized.toLowerCase();
  const { dateRange, branchIds } = parseRaiQuestionScope(lower, now);

  if (isWriteRequest(lower)) {
    return unsupported(
      "Rai MVP currently supports read-only analytics. It cannot change stock, prices, dispensing records, or patient data."
    );
  }

  if (
    lower.includes("business health") ||
    lower.includes("health review") ||
    lower.includes("owner summary") ||
    lower.includes("executive summary")
  ) {
    return { intent: "business_health_review", dateRange, branchIds };
  }

  if (
    lower.includes("cash tied") ||
    lower.includes("capital tied") ||
    lower.includes("tied down") ||
    lower.includes("dead cash")
  ) {
    return { intent: "cash_tied_inventory", dateRange, branchIds };
  }

  if (
    (lower.includes("budget") || lower.includes("₦") || lower.includes("naira")) &&
    (lower.includes("buy") || lower.includes("reorder") || lower.includes("restock") || lower.includes("purchase"))
  ) {
    return {
      intent: "budget_restock_plan",
      budgetNaira: extractBudgetNaira(normalized) ?? 500000,
      objective: "maximize_profit_and_availability",
      dateRange,
      branchIds
    };
  }

  if (
    lower.includes("maximize profit") ||
    lower.includes("maximise profit") ||
    lower.includes("improve profit") ||
    lower.includes("make more money") ||
    lower.includes("increase margin")
  ) {
    return { intent: "profit_maximization", dateRange, branchIds };
  }

  if (lower.includes("forecast") || lower.includes("predict demand") || lower.includes("demand plan")) {
    return {
      intent: "demand_forecast",
      category: lower.includes("antihypertensive") ? "antihypertensive" : "all",
      horizonDays: lower.includes("90") ? 90 : lower.includes("30") ? 30 : 60,
      dateRange,
      branchIds
    };
  }

  if (lower.includes("stock out") || lower.includes("stockout")) {
    return { intent: "stockout_risk", dateRange, branchIds };
  }

  if (lower.includes("expiry") || lower.includes("expire")) {
    return { intent: "expiry_risk", dateRange, branchIds };
  }

  if (lower.includes("slow moving") || lower.includes("slow-moving") || lower.includes("dead stock")) {
    return { intent: "slow_moving_stock", dateRange, branchIds };
  }

  if (lower.includes("reorder") || lower.includes("what should i buy")) {
    return {
      intent: "reorder_forecast",
      medicationQuery: findMedicationQuery(normalized) ?? "Aprovel",
      dateRange,
      branchIds,
      forecastMonths: lower.includes("seven") || lower.includes("7") ? 7 : 3,
      supplyMonthsPerPatient: 3,
      safetyStockPercent: 10
    };
  }

  if (lower.includes("profit") || lower.includes("profitable") || lower.includes("margin")) {
    return {
      intent: "sales_profit_summary",
      category: lower.includes("antihypertensive") ? "antihypertensive" : undefined,
      dateRange,
      branchIds,
      sortBy: "grossProfit"
    };
  }

  const medicationSalesQuery = findMedicationQuery(normalized);
  if (asksForMedicationSalesQuantity(lower) && medicationSalesQuery) {
    const medicationQuery = medicationSalesQuery;

    return {
      intent: "medication_sales_quantity",
      medicationQuery,
      dateRange,
      branchIds
    };
  }

  if (
    lower.includes("antihypertensive") ||
    lower.includes("category") ||
    lower.includes("dispensed")
  ) {
    return {
      intent: "medication_category_usage",
      category: lower.includes("antihypertensive") ? "antihypertensive" : "all",
      dateRange,
      branchIds
    };
  }

  const asksForPatientCount =
    lower.includes("patient") &&
    (lower.includes("how many") ||
      lower.includes("number of") ||
      lower.includes("unique") ||
      lower.includes("without repetition"));

  if (asksForPatientCount) {
    const medicationQuery = findMedicationQuery(normalized);

    if (!medicationQuery) {
      return unsupported(
        "Rai could not identify a supported medication. Try Exforge 10/160, Amaryl 2mg, or Aprovel."
      );
    }

    return {
      intent: "unique_patients_on_medication",
      medicationQuery,
      dateRange,
      branchIds,
      deduplicateBy: "patient_id",
      matchStrength: /\d/.test(medicationQuery)
    };
  }

  const capability = matchRaiCapability(normalized);
  if (capability && !capability.supported) {
    return {
      intent: "rxledger_capability_gap",
      question: normalized,
      capabilityId: capability.id,
      capabilityLabel: capability.label,
      requiredData: capability.requiredData,
      recommendedApiCapabilities: capability.recommendedApiCapabilities,
      dateRange,
      branchIds
    };
  }

  return unsupported(
    "Rai can only answer questions grounded in approved RxLedger analytics data. Ask about sales, inventory, patients, branches, reports, forecasting, profit, continuity demand, approvals, staff activity, or refill follow-up."
  );
}

function findMedicationQuery(question: string): string | null {
  return (
    KNOWN_MEDICATIONS.find((medication) =>
      question.toLowerCase().includes(medication.toLowerCase())
    ) ?? null
  );
}

function isWriteRequest(question: string): boolean {
  return /\b(change|edit|delete|remove|update|adjust|create)\b/.test(question);
}

function asksForMedicationSalesQuantity(question: string): boolean {
  return (
    /\b(how many|number of|qty|quantity|total)\b/.test(question) &&
    /\b(sold|sale|sales|dispensed|issued|given)\b/.test(question)
  );
}

function extractBudgetNaira(question: string): number | null {
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

function unsupported(reason: string): RaiIntent {
  return { intent: "unsupported", reason };
}
