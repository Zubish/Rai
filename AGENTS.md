# Rai Agent Operating Rules

This workspace is only for building Rai.

RxLedger is treated as an external source system and API dependency. RxLedger code review, refactoring, and product planning belong in a separate workspace.

## Product Context

- Rai is an AI pharmacy intelligence assistant connected to RxLedger. It helps pharmacists ask natural-language questions, generate reports, visualize trends, forecast reorder needs, and understand pharmacy performance.
- RxLedger is the external operational source of truth for pharmacy inventory, sales, dispensing, patients, branches, patient follow-up, and future EMR/HMO integrations.
- Rai must be an intelligence layer over approved RxLedger APIs, not an uncontrolled direct database reader.

## Operating Principles

- Inspect before recommending or editing.
- Preserve pharmacy business logic received from approved RxLedger API contracts and domain requirements.
- Keep AI-generated reports grounded in deterministic backend queries.
- Separate product, UI/UX, frontend, backend, database, AI, security, testing, and deployment findings.
- Treat patient, sales, dispensing, and inventory data as sensitive healthtech data.
- Prefer controlled APIs, role-based access, audit logging, and pharmacist approval for high-impact actions.
- When building Rai, start with a narrow MVP before deeper automation.
- Do not review, edit, or plan RxLedger internals from this workspace. Define only the RxLedger API capabilities Rai needs.

## Required Agent Framework

Use the full roster in `docs/agent-os/agent-roster.md`.

Use these workflows:

- `docs/agent-os/workflows.md` for Rai-only build workflows.
- `docs/agent-os/rai-agent-crews.md` for executable Rai agent crews.
- `docs/agent-os/rai-product-implications.md` for Rai product meaning and strategic interpretation.

## Default Output Shape

When asked to review, plan, or build:

1. Rai workspace or product scan summary.
2. Findings grouped by discipline.
3. Agent perspectives used.
4. Prioritized roadmap: urgent, important, future.
5. Risks and mitigations.
6. Concrete implementation plan.
7. Testing and release checks.
