import type { RaiDateRange, RaiIntent } from "./types.js";

const MARCH_2026: RaiDateRange = {
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  label: "March 2026"
};

const LAST_MONTH: RaiDateRange = MARCH_2026;

const ALL_AVAILABLE: RaiDateRange = {
  startDate: "2026-01-01",
  endDate: "2026-06-17",
  label: "All available 2026 data"
};

const KNOWN_MEDICATIONS = ["Exforge 10/160", "Amaryl 2mg", "Aprovel"];

export function parseRaiQuestion(question: string): RaiIntent {
  const normalized = question.trim();
  const lower = normalized.toLowerCase();
  const dateRange = findDateRange(lower);
  const branchIds = ["main"];

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
      dateRange: lower.includes("last month") ? LAST_MONTH : dateRange,
      branchIds,
      sortBy: "grossProfit"
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

  return unsupported(
    "Rai MVP currently supports read-only analytics for medication usage, unique patient counts, profit, reorder, stockout, expiry, and slow-moving stock reports."
  );
}

function findMedicationQuery(question: string): string | null {
  return (
    KNOWN_MEDICATIONS.find((medication) =>
      question.toLowerCase().includes(medication.toLowerCase())
    ) ?? null
  );
}

function findDateRange(question: string): RaiDateRange {
  if (question.includes("march") || question.includes("last month")) {
    return MARCH_2026;
  }

  return ALL_AVAILABLE;
}

function isWriteRequest(question: string): boolean {
  return /\b(change|edit|delete|remove|update|adjust|create|dispense|sell)\b/.test(question);
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
