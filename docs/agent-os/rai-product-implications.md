# What The Agent Framework Means For Rai

## Executive Meaning

The shared conversation turns Rai from a feature idea into a structured product with its own operating model.

Rai should be built as a serious healthtech intelligence product:

- A web application for pharmacists and pharmacy owners.
- A backend analytics service.
- An AI orchestration layer.
- A controlled tool layer that calls approved analytics functions.
- A visual reporting and forecasting system.

RxLedger is relevant only as Rai's external operational data source.

## Product Positioning

Rai is the Pharmacy Intelligence Assistant connected to RxLedger.

The simplest product relationship is:

- RxLedger records pharmacy operations.
- Rai interprets pharmacy data.
- RxLedger remains the source of truth.
- Rai asks approved questions through APIs.
- Pharmacists approve high-impact decisions.

## What Rai Must Become

Rai should not start as a broad chatbot. It should start as a grounded pharmacy intelligence assistant.

The first version should focus on:

- Natural-language reports.
- Medication usage analytics.
- Unique patient counts.
- Drug category reports.
- Reorder forecasting.
- Stockout risk.
- Profit summaries.
- Visual dashboards.
- Downloadable reports.

## Data Rules Rai Needs

Rai needs strong data rules before it can be trusted:

- Deduplicate patients by stable patient ID.
- Normalize medication names, strengths, dosage forms, and pack units.
- Separate transaction count from patient count and quantity dispensed.
- Handle returned, cancelled, voided, and pending medication records.
- Show assumptions beside every AI-generated answer.
- Keep patient and business data out of prompts unless required and approved.

## RxLedger Boundary

This Rai workspace may define required RxLedger API capabilities, such as:

- Medication usage report endpoint.
- Unique patient medication count endpoint.
- Sales and profit summary endpoint.
- Reorder forecast endpoint.
- Stockout risk endpoint.
- Expiry risk endpoint.
- Slow-moving stock endpoint.

This workspace must not review or redesign RxLedger internals. Any direct RxLedger work belongs in a separate workspace.

## Major Risk

The largest risk is allowing AI to sound confident without being grounded in verified data.

Mitigation:

- AI interprets the question.
- Rai backend maps it to a structured intent.
- Approved APIs or deterministic query services return factual data.
- Rai explains the result.
- The UI shows filters, assumptions, source, and confidence.
- Pharmacists approve operational changes.

## MVP Recommendation

Build Rai in this order:

1. Rai product requirements and user journeys.
2. RxLedger analytics API contract requirements.
3. Medication and patient normalization rules.
4. Natural-language query-to-intent layer.
5. Deterministic report engine.
6. Visual dashboard and exports.
7. Reorder forecasting.
8. Evaluation and safety checks.
9. Advanced assistant workflows.
