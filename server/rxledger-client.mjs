const DEFAULT_TIMEOUT_MS = 12_000;

export function createRxLedgerClient({
  baseUrl = process.env.RXLEDGER_BASE_URL || "",
  apiKey = process.env.RXLEDGER_RAI_API_KEY || process.env.RXLEDGER_API_KEY || "",
  fetchImpl = fetch
} = {}) {
  const endpoint = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/rai/analytics-snapshot` : "";

  return {
    isConfigured: Boolean(endpoint && apiKey),
    async analyticsSnapshot({ context, capabilities, startDate, endDate }) {
      if (!endpoint || !apiKey) throw clientError("rxledger_not_configured", "RxLedger connection is not configured.", 503);
      if (!context.userSession || context.mode === "demo") throw clientError("unauthorized", "A verified RxLedger user session is required.", 401);
      let response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}`, "x-rai-user-session": context.userSession },
          redirect: "error",
          signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
          body: JSON.stringify({
            tenant_id: context.tenantId,
            actor_id: context.userId,
            branch_ids: [context.branchId],
            capabilities,
            start_date: startDate,
            end_date: endDate,
            timezone: "Africa/Lagos"
          })
        });
      } catch {
        throw clientError("rxledger_unavailable", "RxLedger is unavailable. Please try again shortly.", 502);
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.data || !payload?.meta) {
        throw clientError("rxledger_request_failed", "RxLedger could not provide approved analytics data.", response.ok ? 502 : response.status || 502);
      }
      if (payload.meta.source !== "rxledger" || payload.meta.tenant_id !== context.tenantId ||
          !Array.isArray(payload.meta.branch_ids) || payload.meta.branch_ids.length !== 1 || payload.meta.branch_ids[0] !== context.branchId ||
          payload.meta.date_range?.start_date !== startDate || payload.meta.date_range?.end_date !== endDate ||
          !Array.isArray(payload.meta.filters?.capabilities) || payload.meta.filters.capabilities.length !== capabilities.length ||
          capabilities.some(item => !payload.meta.filters.capabilities.includes(item))) {
        throw clientError("invalid_snapshot_scope", "RxLedger returned data outside the requested scope.", 502);
      }
      return payload;
    }
  };
}

export function compactAnalyticsContext(snapshot) {
  const medications = Array.isArray(snapshot.data?.medications) ? snapshot.data.medications : [];
  const atRisk = medications
    .filter((item) => item.days_until_stockout <= 14 || item.expiry_risk_quantity > 0)
    .sort((left, right) => left.days_until_stockout - right.days_until_stockout)
    .slice(0, 12)
    .map(({ medication_id, medication_name, strength, category, current_stock, average_monthly_usage, pending_owed_quantity, days_until_stockout, days_since_last_sale, expiry_risk_quantity, cost_per_unit, selling_price_per_unit, stock_value }) => ({ medication_id, medication_name, strength, category, current_stock, average_monthly_usage, pending_owed_quantity, days_until_stockout, days_since_last_sale, expiry_risk_quantity, cost_per_unit, selling_price_per_unit, stock_value }));

  return {
    source: snapshot.meta.source,
    generated_at: snapshot.meta.generated_at,
    branch_ids: snapshot.meta.branch_ids,
    date_range: snapshot.meta.date_range,
    capabilities: snapshot.meta.filters?.capabilities || [],
    medication_count: medications.length,
    continuity_record_count: Number.isSafeInteger(snapshot.data?.continuity_summary?.dispense_line_count) ? snapshot.data.continuity_summary.dispense_line_count : null,
    at_risk_medications: atRisk,
    warnings: snapshot.meta.warnings || []
  };
}

export function capabilitiesForQuestion(message) {
  const question = message.toLowerCase();
  const capabilities = new Set();
  if (/stock|inventory|reorder|expiry|expir|slow.mov|medicine|product/.test(question)) capabilities.add("inventory_analytics");
  if (/sales|sold|revenue|transaction|perform|top.?selling/.test(question)) capabilities.add("sales_analytics");
  if (/profit|margin|cost|budget|financial/.test(question)) capabilities.add("financial_analytics");
  if (/patient|refill|continuity|follow.?up|demand/.test(question)) capabilities.add("continuity_analytics");
  return capabilities.size ? [...capabilities] : ["inventory_analytics"];
}

function clientError(code, message, status) {
  return Object.assign(new Error(message), { code, status });
}
