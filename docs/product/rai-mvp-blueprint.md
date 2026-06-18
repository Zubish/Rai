# Rai MVP Blueprint

## Product Vision

Rai is a pharmacy intelligence assistant that helps pharmacists and pharmacy owners turn operational pharmacy data into clear decisions.

Rai should answer questions such as:

- How many unique patients received Exforge 10/160 in March?
- What antihypertensives were dispensed last month?
- Which medications are likely to stock out soon?
- What should we reorder based on patient demand and current stock?
- Which products have strong sales but weak profit?

## Product Boundary

Rai owns:

- Natural-language analytics experience.
- Report generation.
- Data visualization.
- Reorder intelligence.
- AI explanation layer.
- User-facing assumptions, confidence, and export behavior.

Rai does not own:

- Pharmacy dispensing records.
- Inventory source-of-truth updates.
- Patient master records.
- Sales transaction creation.
- RxLedger internal data models.

## Primary Users

### Superintendent Pharmacist

Needs reliable summaries of patient medication demand, stock risk, and pharmacy trends.

### Branch Pharmacist

Needs quick answers during daily work without manually filtering large reports.

### Pharmacy Owner

Needs profit, stock, slow-moving product, and branch performance insight.

### Inventory Manager

Needs reorder suggestions, stockout risk, expiry risk, and usage velocity.

### Admin / Finance User

Needs sales, cost, gross profit, exportable reports, and audit-safe access.

## MVP Features

### Natural-Language Report Box

User asks a pharmacy question in plain English. Rai converts the question into a structured report intent, calls approved tools, and returns a grounded answer.

### Report Templates

Initial templates:

- Medication usage.
- Unique patients on medication.
- Medication class/category usage.
- Sales and profit summary.
- Reorder forecast.
- Stockout risk.
- Expiry risk.
- Slow-moving stock.

### Visual Dashboard

Initial dashboard panels:

- Top medications by quantity.
- Top medications by revenue.
- Top medications by gross profit.
- Stockout risk.
- Slow-moving stock.
- Expiry risk.
- Chronic medication demand.

### Export

Users can export approved reports as CSV or PDF, subject to role permissions.

### Assumptions Panel

Every AI-assisted report must show:

- Date range.
- Branch or pharmacy scope.
- Metric definition.
- Deduplication rule.
- Filters applied.
- Data source/tool used.
- Missing data warnings.

## Non-Goals For MVP

- Autonomous stock changes.
- Autonomous price changes.
- Clinical diagnosis.
- Medication substitution decisions.
- Direct database access to RxLedger.
- EMR/HMO write integrations.
- Multi-product ecosystem management.

## Success Metrics

- Pharmacist can generate a medication usage report in under 60 seconds.
- Unique patient count reports are deterministic and reproducible.
- Reorder forecast shows assumptions clearly.
- Report exports preserve filters and timestamps.
- AI answer never invents values outside tool results.
- Permission tests pass for sensitive patient and business data.

## MVP Acceptance Criteria

- User can ask at least five supported question types.
- Each supported question maps to a structured intent.
- Each structured intent calls a deterministic tool/API.
- Each answer includes assumptions and source metadata.
- User can view chart and table output.
- User can export CSV for supported reports.
- Admin/pharmacist roles are enforced.
- Failed or missing data returns a clear explanation, not a guessed answer.

