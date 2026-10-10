# Rai and HealthPass operational analytics v1

HealthPass owns clinical records and signed prescriptions; RxLedger owns pharmacy fulfilment. Rai explains authorized aggregate operational metrics. HMO and patient-specific AI capabilities are deferred. This contract implements HealthPass blueprint sections 3 and 17 and the founder's confirmed Rai role for both apps.

## Server contract

HealthPass's trusted server calls `POST /api/rai/healthpass` with `Authorization: Bearer <RAI_HEALTHPASS_API_KEY>` and `x-healthpass-delegated-token`. The body contains `organization_id`, `start_date`, `end_date`, and optional `message`. Dates must be real ordered calendar dates within 366 inclusive days. This endpoint is a server integration, not a browser sign-in flow.

Rai requests `POST <HEALTHPASS_BASE_URL>/api/v1/integrations/rai/analytics-snapshot` with its server-only `HEALTHPASS_RAI_API_KEY` bearer and the delegated token. The request contains the same organization/dates and `capabilities: ["operational_analytics"]`. HealthPass independently verifies grant expiration, revocation, current membership, organization and capability. A service key alone never authorizes data.

The response has `meta.source: "healthpass"`, exact `organization_id`, `date_range: {start_date,end_date}`, `capabilities: ["operational_analytics"]`, and ISO `generated_at`. `data` has exactly seven nonnegative integer counts:

- `prescription_count`
- `dispatched_prescription_count`
- `acknowledged_prescription_count`
- `partially_dispensed_prescription_count`
- `dispensed_prescription_count`
- `cancelled_prescription_count`
- `pending_item_count`

HealthPass calculates these counts inside authorized organization/date scope. Prescription counts and pending item counts are distinct; they never mean unique patients, ingestion or clinical outcome. Detailed metric definitions and temporal selection belong to the HealthPass implementation.

Rai rejects mismatched scope, extra data fields, missing metrics and invalid counts. Only rebuilt aggregate metrics and date/source metadata reach the existing model adapter. Caller message, organization identifiers, patient/order rows, upstream free text, credentials and grant tokens never reach inference. Clinical requests are refused. This endpoint has no record writes or clinical tools.

The response's `metrics` are authoritative backend values. `explanation` is supplementary model output and explicitly requires review. Inference failure returns verified metrics with `explanation_status: "unavailable"`, preserving the core workflow.

## Setup and verification

Configure `HEALTHPASS_BASE_URL` as an exact HTTPS origin; configure both independent server credentials and the HealthPass delegated access implementation. Keep `RAI_HEALTHPASS_ENABLED=false` until signed-in/delegated integration tests pass. Never place keys in browser variables. Existing RxLedger enable flags and consent flow remain separate.

Run `npm test` (includes `server/healthpass-analytics.test.mjs`) and `npm run build`. Verify real scoped HealthPass grants on an isolated synthetic environment, including denial, expiry/revocation, different organizations, invalid dates, upstream/model outage and response minimization. No deployment or activation is implied by source implementation. Approved inference geography and numerical evaluation remain release requirements; no silent cloud fallback.

Rollback: set `RAI_HEALTHPASS_ENABLED=false`. Core HealthPass prescription and RxLedger fulfilment processing must continue without Rai.
