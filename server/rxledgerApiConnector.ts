import type { RaiAnalyticsDataSource } from "../src/lib/analyticsEngine.js";
import type { DispenseRecord, Medication } from "../src/lib/mockRxLedgerData.js";
import { loadRaiEnvironment } from "./env.js";
import type { RaiChatRequest } from "./raiChatService.js";

type RxLedgerSnapshotResponse = {
  data?: unknown;
  meta?: unknown;
  medications?: unknown;
  dispensedMedicationRecords?: unknown;
  dispensed_medication_records?: unknown;
  dispense_records?: unknown;
};

export type RxLedgerConnectionStatus = {
  configured: boolean;
  baseUrl?: string;
  snapshotPath: string;
};

const defaultSnapshotPath = "/api/rai/analytics-snapshot";

export function getRxLedgerConnectionStatus(): RxLedgerConnectionStatus {
  loadRaiEnvironment();
  const baseUrl = process.env.RXLEDGER_API_BASE_URL?.trim();
  return {
    configured: Boolean(baseUrl && process.env.RXLEDGER_API_KEY),
    baseUrl,
    snapshotPath: process.env.RXLEDGER_ANALYTICS_SNAPSHOT_PATH || defaultSnapshotPath
  };
}

export async function getRxLedgerAnalyticsDataSource(
  request: RaiChatRequest
): Promise<RaiAnalyticsDataSource | undefined> {
  const status = getRxLedgerConnectionStatus();
  if (!status.configured || !status.baseUrl) {
    return undefined;
  }

  const response = await fetch(new URL(status.snapshotPath, ensureTrailingSlash(status.baseUrl)), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RXLEDGER_API_KEY}`,
      "X-Rai-Source": "rai"
    },
    body: JSON.stringify({
      tenant_id: request.tenantId ?? process.env.RXLEDGER_TENANT_ID ?? "demo-tenant",
      branch_ids: request.branchIds?.length
        ? request.branchIds
        : parseBranchIds(process.env.RXLEDGER_BRANCH_IDS),
      start_date: process.env.RXLEDGER_ANALYTICS_START_DATE ?? "2026-01-01",
      end_date: process.env.RXLEDGER_ANALYTICS_END_DATE ?? new Date().toISOString().slice(0, 10),
      timezone: process.env.RXLEDGER_TIMEZONE ?? "Africa/Lagos",
      include_voided: false,
      include_returns: false
    })
  });

  if (!response.ok) {
    throw new Error(`RxLedger API returned ${response.status}`);
  }

  const payload = (await response.json()) as RxLedgerSnapshotResponse;
  const data = isObjectRecord(payload.data) ? payload.data : payload;
  const liveMedications = getArray(data, ["medications", "products", "inventory"]);
  const liveDispenseRecords = getArray(data, [
    "dispensedMedicationRecords",
    "dispensed_medication_records",
    "dispense_records",
    "dispensing_records",
    "transactions"
  ]);
  const mappedMedications = liveMedications.map(mapMedication).filter(isDefined);
  const mappedRecords = liveDispenseRecords.map(mapDispenseRecord).filter(isDefined);

  if (mappedMedications.length === 0) {
    throw new Error("RxLedger API response did not include medication analytics data.");
  }

  return {
    medications: mappedMedications,
    dispensedMedicationRecords: mappedRecords,
    sourceLabel: "live RxLedger API"
  };
}

function mapMedication(input: unknown): Medication | undefined {
  if (!isObjectRecord(input)) {
    return undefined;
  }

  const id = text(input.medication_id) || text(input.id) || text(input.product_id);
  const name = text(input.medication_name) || text(input.name) || text(input.product_name);
  if (!id || !name) {
    return undefined;
  }

  const currentStock = number(input.current_stock ?? input.currentStock ?? input.stock_on_hand);
  const averageMonthlyUsage = number(input.average_monthly_usage ?? input.averageMonthlyUsage ?? input.monthly_usage);
  const costPerUnit = number(input.cost_per_unit ?? input.costPerUnit ?? input.unit_cost);
  const sellingPricePerUnit = number(input.selling_price_per_unit ?? input.sellingPricePerUnit ?? input.unit_price);
  const daysUntilStockout =
    number(input.days_until_stockout ?? input.daysUntilStockout) ||
    calculateDaysUntilStockout(currentStock, averageMonthlyUsage);

  return {
    id,
    name,
    strength: text(input.strength) || "",
    category: normalizeCategory(text(input.category) || text(input.therapeutic_category) || "uncategorized"),
    unit: text(input.unit) || text(input.dosage_form) || "units",
    costPerUnit,
    sellingPricePerUnit,
    currentStock,
    averageMonthlyUsage,
    pendingOwedQuantity: number(input.pending_owed_quantity ?? input.pendingOwedQuantity ?? input.owed_quantity),
    supplierLeadTimeDays: number(input.supplier_lead_time_days ?? input.supplierLeadTimeDays ?? input.lead_time_days) || 7,
    expiryRiskQuantity: number(input.expiry_risk_quantity ?? input.expiryRiskQuantity ?? input.expiring_quantity),
    daysUntilStockout,
    daysSinceLastSale: number(input.days_since_last_sale ?? input.daysSinceLastSale) || 0,
    stockValue: number(input.stock_value ?? input.stockValue) || currentStock * costPerUnit
  };
}

function mapDispenseRecord(input: unknown): DispenseRecord | undefined {
  if (!isObjectRecord(input)) {
    return undefined;
  }

  const transactionId = text(input.transaction_id) || text(input.transactionId) || text(input.id);
  const patientId = text(input.patient_id) || text(input.patientId) || text(input.customer_id);
  const medicationId = text(input.medication_id) || text(input.medicationId) || text(input.product_id);
  const dispensedAt = text(input.dispensed_at) || text(input.dispensedAt) || text(input.created_at);

  if (!transactionId || !patientId || !medicationId || !dispensedAt) {
    return undefined;
  }

  return {
    transactionId,
    patientId,
    medicationId,
    quantity: number(input.quantity ?? input.quantity_dispensed),
    branchId: text(input.branch_id) || text(input.branchId) || "main",
    dispensedAt: dispensedAt.slice(0, 10),
    voided: Boolean(input.voided),
    returned: Boolean(input.returned)
  };
}

function getArray(source: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function parseBranchIds(value: string | undefined): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? ["main"];
}

function calculateDaysUntilStockout(currentStock: number, averageMonthlyUsage: number): number {
  if (averageMonthlyUsage <= 0) {
    return 999;
  }
  return Math.max(0, Math.floor(currentStock / (averageMonthlyUsage / 30)));
}

function normalizeCategory(category: string): string {
  return category.toLowerCase().trim();
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
