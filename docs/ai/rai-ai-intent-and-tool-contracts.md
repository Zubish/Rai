# Rai AI Intent And Tool Contracts

Rai's AI layer must not answer factual pharmacy analytics from memory. It must convert user questions into structured intents, call approved tools, and explain returned data.

## Supported Intent Types

### `medication_usage_report`

Example user question:

```text
Generate report on total antihypertensives dispensed in March.
```

Intent:

```json
{
  "intent": "medication_usage_report",
  "medication_query": null,
  "category": "antihypertensive",
  "date_range": {
    "start_date": "2026-03-01",
    "end_date": "2026-03-31"
  },
  "group_by": "medication"
}
```

### `unique_patients_on_medication`

Example user question:

```text
How many patients treated throughout March are on Exforge 10/160 without repetition?
```

Intent:

```json
{
  "intent": "unique_patients_on_medication",
  "medication_query": "Exforge 10/160",
  "date_range": {
    "start_date": "2026-03-01",
    "end_date": "2026-03-31"
  },
  "deduplicate_by": "patient_id",
  "match_strength": true
}
```

### `reorder_forecast`

Example user question:

```text
Based on usage, how much Aprovel do we need for seven months if each patient gets three months supply?
```

Intent:

```json
{
  "intent": "reorder_forecast",
  "medication_query": "Aprovel",
  "forecast_months": 7,
  "supply_months_per_patient": 3,
  "safety_stock_percent": 10
}
```

### `sales_profit_summary`

Example user question:

```text
Show the most profitable antihypertensives last month.
```

Intent:

```json
{
  "intent": "sales_profit_summary",
  "category": "antihypertensive",
  "date_range": "last_month",
  "group_by": "medication",
  "sort_by": "gross_profit",
  "sort_direction": "desc"
}
```

## Tool Definitions

### `get_medication_usage_report`

Inputs:

- tenant_id
- branch_ids
- start_date
- end_date
- medication_query
- category
- group_by

Output:

- rows
- totals
- metadata
- warnings

### `get_unique_patients_on_medication`

Inputs:

- tenant_id
- branch_ids
- start_date
- end_date
- medication_query
- deduplicate_by
- match_strength

Output:

- unique_patient_count
- transaction_count
- quantity_dispensed
- medication_match
- metadata
- warnings

### `get_reorder_forecast_inputs`

Inputs:

- tenant_id
- branch_ids
- medication_query
- forecast_months
- supply_months_per_patient
- safety_stock_percent

Output:

- current_stock_quantity
- average_monthly_usage
- unique_patient_count
- pending_owed_quantity
- pack_size
- minimum_order_unit
- supplier_lead_time_days
- expiry_risk_quantity
- metadata
- warnings

### `get_sales_profit_summary`

Inputs:

- tenant_id
- branch_ids
- start_date
- end_date
- category
- medication_query
- group_by

Output:

- revenue
- cost
- gross_profit
- gross_margin_percent
- grouped_rows
- metadata
- warnings

## Response Format

Every Rai answer should include:

- Direct answer.
- Key numbers.
- Chart/table data.
- Assumptions.
- Filters used.
- Data source/tool used.
- Warnings.
- Suggested next action.

## Safety Rules

- Do not invent counts, stock, revenue, cost, profit, or patient numbers.
- If a tool returns no data, say no matching data was found.
- If medication matching is ambiguous, ask for clarification or show possible matches.
- Do not provide diagnosis or medication substitution advice.
- Do not expose patient-identifiable details unless the user's role permits it.
- Do not recommend operational changes without showing assumptions.

## Evaluation Cases

### Duplicate Patient Count

Input:

```text
Without repetition, how many patients are on Amaryl 2mg?
```

Expected:

- Intent is `unique_patients_on_medication`.
- Deduplication is by patient ID.
- Repeat purchases by same patient count once.

### Ambiguous Medication

Input:

```text
How many patients are on amlodipine?
```

Expected:

- If multiple strengths exist, Rai asks whether the user wants all strengths or a specific strength.

### Reorder Forecast

Input:

```text
How much Aprovel do we need for seven months?
```

Expected:

- Rai asks or assumes documented dosage/supply rules.
- Uses deterministic stock and usage data.
- Shows current stock, pending owed quantity, safety buffer, and minimum order unit.

