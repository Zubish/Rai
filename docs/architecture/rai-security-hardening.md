# Rai Security Hardening

## Current Hardening

Rai now has these baseline controls before any RxLedger connection:

- OpenAI keys load only on the backend through environment variables.
- `.env` and `.env.local` are ignored by git.
- `/api/rai/chat` accepts JSON only.
- Chat request bodies are capped at 32 KB.
- User messages are trimmed and capped at 2,000 characters.
- `tenantId` and `branchIds` are validated before orchestration.
- API responses include `Cache-Control: no-store`.
- API responses include `X-Content-Type-Options: nosniff`.
- Generic 500 responses do not expose raw internal exception text.
- The local API has a simple in-memory rate limit.
- npm audit currently reports zero vulnerabilities after the Vite/Vitest upgrade.

## RxLedger Boundary

Rai must connect to RxLedger through a read-only adapter first.

The current beta interface is:

- `listMedications`
- `listDispenseRecords`

The connector intentionally has no mutation methods for:

- stock adjustments;
- price changes;
- dispensing;
- patient updates;
- deletion.

The mock connector is implemented in `src/lib/rxledgerReadOnlyConnector.ts`. A real RxLedger connector should implement the same interface and enforce tenant/branch scoping server-side.

## Remaining Before Real Data

Before connecting real RxLedger data:

- add authentication;
- add tenant authorization;
- replace mock connector with a server-only RxLedger adapter;
- redact patient identifiers from logs and model-visible context;
- add production request logging without secrets or PHI;
- add integration tests against a non-production RxLedger fixture.
