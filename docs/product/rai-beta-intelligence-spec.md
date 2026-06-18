# Rai Beta Intelligence Spec

## Product Definition

Rai is a pharmacy business intelligence assistant. Its first beta should help an owner, pharmacist, or operations lead ask natural-language business questions and receive grounded analysis, calculations, assumptions, and recommended actions.

Rai is not only a chat UI. The chat interface is the entry point into a tool-using intelligence system:

1. Classify the user's business question.
2. Select the correct approved analytical tool.
3. Calculate from pharmacy data.
4. Explain assumptions and confidence.
5. Recommend practical business actions.

## Beta Use Case

The beta use case is pharmacy profit and inventory intelligence before secure RxLedger connection.

Rai should answer questions like:

- What should I buy with a fixed restock budget?
- Which medicines are generating profit?
- Which products will stock out soon?
- Where is cash tied down in stock?
- What demand should I plan for over 30, 60, or 90 days?
- Which products are at expiry risk?
- What is the overall business health of the pharmacy?

## Required Beta Tools

| Tool | Purpose | Beta status |
| --- | --- | --- |
| `get_unique_patients_on_medication` | Count unique patients on a medication without double-counting repeat purchases. | Implemented |
| `get_medication_category_usage` | Summarize category usage, revenue, and gross profit. | Implemented |
| `get_sales_profit_summary` | Rank medicines by gross profit and margin. | Implemented |
| `get_reorder_forecast` | Recommend reorder quantity from demand, stock, owed quantity, and safety buffer. | Implemented |
| `get_stockout_risk` | Rank medicines by stockout exposure. | Implemented |
| `get_expiry_risk` | Identify expiry-exposed inventory. | Implemented |
| `get_slow_moving_stock` | Identify weak movement and idle stock. | Implemented |
| `build_restock_budget_plan` | Allocate a fixed purchasing budget across urgent and profitable medicines. | Implemented |
| `forecast_category_demand` | Forecast category demand for a planning horizon. | Implemented |
| `find_profit_maximization_levers` | Recommend practical profit improvement moves. | Implemented |
| `find_cash_tied_in_inventory` | Identify working capital trapped in slow or risky stock. | Implemented |
| `summarize_business_health` | Combine profit, stockout, expiry, and cash signals into an owner summary. | Implemented |

## AI Architecture Direction

The beta should use TypeScript, React, and Vite for the product UI and local deterministic intelligence tools. Rai should not call an OpenAI model directly from the browser because API keys and private business data must stay server-side.

The secure AI path should be:

1. React/Vite UI sends the user question to a backend `/api/rai/chat` endpoint.
2. Backend runs the Rai orchestrator.
3. Orchestrator uses an OpenAI model for language understanding and tool selection.
4. Approved tools calculate from read-only data.
5. Backend returns a structured `RaiReport`.
6. UI renders answer, chart, table, assumptions, warnings, confidence, and agent route.

Python should be introduced later as a separate forecasting/statistics service only when TypeScript formulas are no longer enough. Good Python candidates are time-series forecasting, basket analysis, anomaly detection, price optimization, and advanced demand simulation.

## Data Boundary

Before RxLedger connection, Rai uses synthetic local data. During final beta integration, Rai should connect to RxLedger through read-only APIs or read-only database views first.

Rai must not:

- mutate stock;
- change prices;
- create dispensing records;
- expose patient identities;
- make clinical treatment decisions;
- invent unavailable data.

## Quality Bar

Rai beta is acceptable only when:

- each supported question maps to a tested tool;
- every numerical answer is reproducible from data;
- every report shows assumptions and warnings;
- unsupported or unsafe requests are blocked;
- business recommendations are practical and traceable;
- the UI feels premium, calm, and decision-oriented.
