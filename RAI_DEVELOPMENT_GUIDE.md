# Rai Development Guide

## Product Mission

Rai is RxLedger's pharmacy intelligence assistant. It helps pharmacy owners, pharmacists, inventory managers, and finance users ask natural-language questions, understand performance, generate reports, visualize trends, and forecast operational needs.

RxLedger records pharmacy operations and remains the external source of truth. Rai interprets approved RxLedger data through secure APIs. Rai must never depend on uncontrolled direct access to RxLedger's database.

## Core Principles

1. **Ground truth before language.** Deterministic services calculate counts, revenue, profit, stock risk, forecasts, and clinical rules. The language model interprets intent and explains verified results.
2. **Never invent operational facts.** Missing or ambiguous data must produce a clear limitation or clarification request, never a guessed answer.
3. **Support professionals, do not replace them.** Pharmacists retain authority over clinical and operational decisions. High-impact actions require explicit approval and audit logging.
4. **Protect pharmacy data.** Enforce tenant and branch boundaries, least-privilege access, role-based permissions, minimal data disclosure, secure secrets, and privacy-safe logging.
5. **Make every answer auditable.** Show date range, branch scope, filters, metric definitions, assumptions, warnings, source tools, and generation time where relevant.
6. **Build Rai only in this workspace.** RxLedger is an external API dependency. Its internal implementation belongs in a separate workspace.
7. **Start narrow and earn trust.** Deliver a reliable pharmacy analytics MVP before autonomous workflows or broader clinical capabilities.

## Phase 1: Pharmacy Business Intelligence

Rai's first production use case is chat-first pharmacy analytics. It must support:

- Medication usage and unique-patient analysis.
- Sales, cost, gross profit, and margin analysis.
- Branch and date-aware comparisons.
- Stockout, expiry, and slow-moving-stock risk.
- Reorder recommendations using verified demand, stock, lead-time, and safety-stock inputs.
- Tables, charts, summaries, recommended actions, and permission-aware exports.
- Clear handling of greetings, follow-up questions, ambiguity, missing data, and unsupported requests.

The MVP must not autonomously change stock, prices, dispensing records, patients, or financial records.

## Intelligence Architecture

The standard request flow is:

1. Authenticate the user and resolve tenant, role, and permitted branches.
2. Classify the message as conversation, clarification, analytics, report, or unsupported request.
3. Convert analytics questions into a validated structured intent.
4. Call only approved read-only RxLedger APIs or deterministic Rai tools.
5. Validate tool responses and calculations.
6. Let the model explain the verified result without altering factual values.
7. Render the answer in the chat with its scope, assumptions, sources, warnings, and available actions.
8. Record privacy-safe audit and observability events.

The model provider must remain replaceable. Provider-specific logic belongs behind one adapter so Rai can use Gemini, OpenAI, or another approved model without changing product behavior.

## External RxLedger Boundary

Rai may request approved capabilities for medication usage, unique patients, categories, sales and profit, reorder inputs, stockout risk, expiry risk, slow-moving stock, branch discovery, and report metadata.

Every request and response must enforce tenant and branch scope. Responses should include source, generation time, date range, filters, and warnings. MVP access is read-only and authenticated server to server.

## Data Integrity Rules

- Deduplicate patients using a stable privacy-safe patient identifier.
- Normalize medication name, strength, dosage form, category, pack size, and unit.
- Keep transaction count, patient count, and quantity dispensed distinct.
- Define handling for returns, voids, cancellations, pending quantities, and missing records.
- Use currency-safe arithmetic and documented rounding.
- Make dates timezone-aware, defaulting to `Africa/Lagos` only when product context permits.
- Forecasts must expose the method, historical window, assumptions, and uncertainty.

## User Experience Direction

Rai is a calm, premium, chat-first product rather than a crowded dashboard.

- New sessions open with one clear prompt and useful pharmacy-specific suggestions.
- User questions and Rai outputs remain in one conversation flow.
- Tables, charts, reports, insights, and recommended actions render inside messages.
- Navigation supports chats, projects, library, connected apps, and account controls without competing with the conversation.
- Use RxLedger brand colours with restraint, strong typography, accessible contrast, responsive spacing, and complete light and dark modes.
- Every interactive element needs a functional state: default, hover, focus, loading, success, empty, error, disabled, and permission denied where applicable.
- Desktop and mobile experiences must be tested at realistic sizes.

## Safety And Security

- Keep all provider and RxLedger credentials server-side.
- Validate and rate-limit API requests.
- Apply authentication and authorization before data retrieval.
- Minimize patient and business data sent to model providers.
- Never place sensitive records, secrets, or full prompts in logs.
- Protect against prompt injection and unapproved tool invocation.
- Require explicit pharmacist approval for future write operations.
- Maintain auditable records for exports, sensitive queries, approvals, and overrides.

## Development Workflow

Use the full Rai agent roster as perspectives, activating focused crews for each task:

- Product Strategy Crew for scope and acceptance criteria.
- Architecture Crew for boundaries, contracts, security, and data flow.
- AI Intelligence Crew for intent routing, tools, grounding, prompts, and evaluations.
- UX and Visual Intelligence Crew for journeys, interface, accessibility, and microcopy.
- Implementation Crew for scoped code changes.
- Quality and Safety Crew for tests, privacy, factuality, and release decisions.
- Delivery Crew for sequencing, dependencies, documentation, and release coordination.

Every feature follows: **Define -> Design -> Build -> Verify -> Release**.

Inspect the workspace first. Define the user problem, acceptance criteria, required data, failure states, and security implications before implementation. Keep changes scoped and document material decisions.

## Quality Bar

A feature is complete only when:

- Its business metric and formulas are defined.
- Its API and tool contracts are validated.
- Factual output comes from deterministic data operations.
- Empty, loading, error, permission, and missing-data states work.
- Unit, contract, integration, and relevant end-to-end tests pass.
- AI evaluations cover greetings, ambiguity, follow-ups, injection attempts, unsupported questions, and factual grounding.
- Accessibility, responsive design, security, privacy, and audit behavior are verified.
- Known limitations and release rollback steps are documented.

## Roadmap

### Urgent

Establish the product shell, authentication boundary, conversation persistence, approved RxLedger API contracts, structured intent router, deterministic analytics tools, grounded model orchestration, and core automated tests.

### Important

Add complete report rendering, charting, exports, projects, library, branch-aware follow-ups, forecasting, observability, AI evaluations, and polished mobile and desktop UX.

### Future

Add tightly governed workflow actions, advanced forecasting services, evidence-grounded clinical decision support, and broader ecosystem integrations. Clinical logic must remain deterministic, cited, reviewed, and auditable.

## Non-Negotiable Release Rule

Rai may sound intelligent, but it earns trust through correctness. No release is acceptable if Rai can present invented pharmacy figures, cross tenant or branch boundaries, expose sensitive data, or imply that an uncompleted action was completed.
