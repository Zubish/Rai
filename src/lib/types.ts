export type RaiDateRange = {
  startDate: string;
  endDate: string;
  label: string;
};

export type RaiIntentName =
  | "unique_patients_on_medication"
  | "medication_sales_quantity"
  | "medication_category_usage"
  | "sales_profit_summary"
  | "reorder_forecast"
  | "stockout_risk"
  | "expiry_risk"
  | "slow_moving_stock"
  | "budget_restock_plan"
  | "demand_forecast"
  | "profit_maximization"
  | "cash_tied_inventory"
  | "business_health_review"
  | "rxledger_capability_gap";

export type BaseIntent = {
  intent: RaiIntentName;
  dateRange: RaiDateRange;
  branchIds: string[];
};

export type UniquePatientsIntent = BaseIntent & {
  intent: "unique_patients_on_medication";
  medicationQuery: string;
  deduplicateBy: "patient_id";
  matchStrength: boolean;
};

export type MedicationSalesQuantityIntent = BaseIntent & {
  intent: "medication_sales_quantity";
  medicationQuery: string;
};

export type MedicationCategoryUsageIntent = BaseIntent & {
  intent: "medication_category_usage";
  category: string;
};

export type SalesProfitSummaryIntent = BaseIntent & {
  intent: "sales_profit_summary";
  category?: string;
  sortBy: "grossProfit";
};

export type ReorderForecastIntent = BaseIntent & {
  intent: "reorder_forecast";
  medicationQuery: string;
  forecastMonths: number;
  supplyMonthsPerPatient: number;
  safetyStockPercent: number;
};

export type RiskIntent = BaseIntent & {
  intent: "stockout_risk" | "expiry_risk" | "slow_moving_stock";
};

export type BudgetRestockPlanIntent = BaseIntent & {
  intent: "budget_restock_plan";
  budgetNaira: number;
  objective: "maximize_profit_and_availability";
};

export type DemandForecastIntent = BaseIntent & {
  intent: "demand_forecast";
  category: string;
  horizonDays: number;
};

export type BusinessAdvisoryIntent = BaseIntent & {
  intent: "profit_maximization" | "cash_tied_inventory" | "business_health_review";
};

export type RxLedgerCapabilityGapIntent = BaseIntent & {
  intent: "rxledger_capability_gap";
  question: string;
  capabilityId: string;
  capabilityLabel: string;
  requiredData: string[];
  recommendedApiCapabilities: string[];
};

export type UnsupportedIntent = {
  intent: "unsupported";
  reason: string;
};

export type RaiIntent =
  | UniquePatientsIntent
  | MedicationSalesQuantityIntent
  | MedicationCategoryUsageIntent
  | SalesProfitSummaryIntent
  | ReorderForecastIntent
  | RiskIntent
  | BudgetRestockPlanIntent
  | DemandForecastIntent
  | BusinessAdvisoryIntent
  | RxLedgerCapabilityGapIntent
  | UnsupportedIntent;

export type MetricCard = {
  label: string;
  value: string;
  helper?: string;
};

export type ReportTable = {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>;
};

export type RaiReport = {
  status: "success" | "unsupported";
  id: string;
  intentLabel: string;
  title: string;
  directAnswer: string;
  summary: string;
  toolName: string;
  metricCards: MetricCard[];
  chartData: Array<{ label: string; value: number }>;
  table: ReportTable;
  assumptions: string[];
  warnings: string[];
  suggestedActions: string[];
  agentTrace?: string[];
  confidence?: "high" | "medium" | "low";
};

export type UniquePatientsRequest = {
  tenantId: string;
  branchIds: string[];
  medicationQuery: string;
  startDate: string;
  endDate: string;
  deduplicateBy: "patient_id";
  matchStrength: boolean;
};

export type UniquePatientsResult = {
  toolName: "get_unique_patients_on_medication";
  medicationMatch: {
    medicationId: string | null;
    medicationName: string;
    strength: string | null;
    unit: string;
  };
  uniquePatientCount: number;
  transactionCount: number;
  quantityDispensed: number;
  deduplicationRule: "patient_id";
  dateRange: RaiDateRange;
  branchIds: string[];
  warnings: string[];
  source: {
    system: "mock_rxledger_api";
    generatedAt: string;
  };
};
