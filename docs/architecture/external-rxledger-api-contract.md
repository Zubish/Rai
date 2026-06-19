# Required External RxLedger API Contract For Rai

This document defines the external API capabilities Rai needs from RxLedger.

It does not review or redesign RxLedger internals.

## Contract Principles

- Rai should access RxLedger through approved APIs only.
- Endpoints should be read-only for MVP.
- Every response should include enough metadata for Rai to explain filters, scope, and assumptions.
- Patient identifiers should be stable but privacy-safe.
- Branch and tenant boundaries must be enforced by RxLedger and respected by Rai.
- Exports and sensitive queries should be auditable.

## Common Request Fields

```json
{
  "tenant_id": "string",
  "branch_ids": ["string"],
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "timezone": "Africa/Lagos",
  "include_voided": false,
  "include_returns": false
}
```

## Common Response Metadata

```json
{
  "data": {},
  "meta": {
    "source": "rxledger",
    "generated_at": "ISO-8601",
    "tenant_id": "string",
    "branch_ids": ["string"],
    "date_range": {
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD"
    },
    "filters": {},
    "warnings": []
  }
}
```

## MVP Snapshot Endpoint

Purpose: provide Rai with a read-only, branch-aware analytics snapshot for the current MVP before deeper per-report endpoints are available.

```text
POST /api/rai/analytics-snapshot
Authorization: Bearer <RXLEDGER_API_KEY>
```

Minimum request body:

```json
{
  "tenant_id": "totalenergies",
  "branch_ids": ["lagos"],
  "start_date": "2026-06-18",
  "end_date": "2026-06-18",
  "timezone": "Africa/Lagos",
  "include_voided": false,
  "include_returns": false
}
```

Minimum response body:

```json
{
  "data": {
    "medications": [],
    "dispensed_medication_records": []
  },
  "meta": {
    "source": "rxledger",
    "tenant_id": "totalenergies",
    "branch_ids": ["lagos"]
  }
}
```

Required medication fields:

- medication_id
- medication_name
- strength
- category
- unit or dosage_form
- current_stock
- average_monthly_usage
- cost_per_unit
- selling_price_per_unit

Required dispensing fields:

- transaction_id
- patient_id
- medication_id
- quantity_dispensed
- branch_id
- dispensed_at
- voided
- returned

Current production check on `https://rxledger.vercel.app/api/rai/analytics-snapshot` returns `404 Not Found`, so RxLedger still needs to expose this approved endpoint and issue the bearer key before Rai can read live TotalEnergies data.

## Endpoint 1: Medication Usage Report

Purpose: show medication quantity, transaction count, revenue, and gross profit.

```text
POST /analytics/medication-usage
```

Request additions:

```json
{
  "medication_query": "string",
  "category": "string",
  "group_by": "medication|category|branch|month"
}
```

Required response fields:

- medication_id
- medication_name
- strength
- dosage_form
- category
- quantity_dispensed
- transaction_count
- revenue
- cost
- gross_profit
- branch_id

## Endpoint 2: Unique Patients On Medication

Purpose: count unique patients on a medication without double-counting repeat purchases.

```text
POST /analytics/unique-patients-on-medication
```

Request additions:

```json
{
  "medication_query": "string",
  "deduplicate_by": "patient_id",
  "match_strength": true
}
```

Required response fields:

- medication_id
- medication_name
- strength
- unique_patient_count
- transaction_count
- quantity_dispensed
- deduplication_rule

## Endpoint 3: Medication Category Usage

Purpose: answer category questions such as antihypertensive usage.

```text
POST /analytics/medication-category-usage
```

Request additions:

```json
{
  "category": "antihypertensive",
  "include_medications": true
}
```

Required response fields:

- category
- total_quantity_dispensed
- total_revenue
- total_gross_profit
- unique_patient_count
- medications

## Endpoint 4: Sales And Profit Summary

Purpose: summarize revenue, cost, gross profit, and margin.

```text
POST /analytics/sales-profit-summary
```

Request additions:

```json
{
  "group_by": "day|week|month|branch|category|medication"
}
```

Required response fields:

- revenue
- cost
- gross_profit
- gross_margin_percent
- transaction_count
- group_key

## Endpoint 5: Reorder Forecast Inputs

Purpose: provide the raw deterministic inputs Rai needs to recommend reorder quantities.

```text
POST /analytics/reorder-forecast-inputs
```

Request additions:

```json
{
  "medication_query": "string",
  "forecast_months": 7,
  "supply_months_per_patient": 3,
  "safety_stock_percent": 10
}
```

Required response fields:

- medication_id
- medication_name
- strength
- unit
- pack_size
- current_stock_quantity
- average_monthly_usage
- unique_patient_count
- pending_owed_quantity
- supplier_lead_time_days
- minimum_order_unit
- expiry_risk_quantity

## Endpoint 6: Stockout Risk

Purpose: identify medications likely to run out.

```text
POST /analytics/stockout-risk
```

Required response fields:

- medication_id
- medication_name
- current_stock_quantity
- average_daily_usage
- estimated_days_until_stockout
- risk_level

## Endpoint 7: Expiry Risk

Purpose: identify stock at risk of expiring.

```text
POST /analytics/expiry-risk
```

Required response fields:

- medication_id
- medication_name
- batch_number
- expiry_date
- quantity_at_risk
- estimated_usage_before_expiry
- risk_level

## Endpoint 8: Slow-Moving Stock

Purpose: identify stock tying down capital.

```text
POST /analytics/slow-moving-stock
```

Required response fields:

- medication_id
- medication_name
- current_stock_quantity
- days_since_last_sale
- average_monthly_usage
- stock_value
- suggested_action

## Open Questions

- Which patient identifier can Rai use safely for deduplication?
- Does RxLedger already normalize medication names, strengths, and dosage forms?
- Does RxLedger store cost price per batch or per product?
- How are returns, voided transactions, and owed/pending medication represented?
- How are tenant and branch permissions enforced for analytics requests?
