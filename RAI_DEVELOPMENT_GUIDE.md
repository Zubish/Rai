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

## Optional Local AI Connection

Rai may support a private local-model path for development, low-cost evaluation, or deployments that require tighter data control. A local runtime such as Ollama can expose a chat model and an embedding model through separate APIs; `nomic-embed-text` is appropriate for document embeddings, while a lightweight instruction model can support conversational explanation.

This is an implementation option, not a change to Rai's trust model:

- Keep the model behind the same server-side provider adapter used for cloud models.
- Use embeddings only to retrieve approved documents, policies, and report definitions; retrieved text is context, not a source of operational figures.
- Never give a local or cloud model direct RxLedger or Neon database credentials.
- Continue to obtain pharmacy metrics, patient counts, forecasts, and recommendations from approved APIs and deterministic Rai services.
- Treat local development runtimes as non-production until access control, observability, model evaluation, patching, and infrastructure ownership are defined.

The important architectural decision is that a model is an interchangeable reasoning and explanation layer. Rai's facts, permissions, calculations, and audit trail must remain outside the model.

### Local API Contract

The development stack exposes the following internal Rai endpoints:

- `GET /api/rai/health`: reports model-provider reachability and configured-model availability without exposing credentials.
- `POST /api/rai/chat`: accepts a validated message and conversation id, resolves authorised context, calls the provider only when needed, and returns an auditable reply envelope.

In local development, the API provides an isolated demo context. Production requests must carry tenant, branch, and role from the RxLedger-authenticated server session; the browser must never manufacture these headers or contact a model provider directly.

## External RxLedger Boundary

Rai may request approved capabilities for medication usage, unique patients, categories, sales and profit, reorder inputs, stockout risk, expiry risk, slow-moving stock, branch discovery, and report metadata.

Every request and response must enforce tenant and branch scope. Responses should include source, generation time, date range, filters, and warnings. MVP access is read-only and authenticated server to server.

The executable scope guardrail is documented in `RAI_RXLEDGER_ACCESS_CONTRACT.md`. No change may expand the data contract or role matrix without updating that document and its RxLedger enforcement.

Delegated-access backend progress and remaining sign-in release gates are tracked in `RAI_CONNECTION_ROLLOUT.md`. The protocol implementation is not yet a user-operable connection; consent UI, callback state validation and Rai browser sessions remain required.

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

## Expanded Vision: BI-First, Not BI-Only

The user-provided `RAI_Project_Discussion.txt` extends the long-term vision to an observant pharmacy intelligence and safety layer. Rai should make important details harder to miss without replacing the pharmacist. Future behaviour is observe, analyse and alert, with accountable human decisions.

**Do not restrict Rai by questions. Restrict Rai by capabilities, permissions, evidence and data boundaries.**

Use composable, typed tools rather than one handler per example question. The model proposes a structured analytical plan; application code validates datasets, filters, dates, grouping, metrics and resource limits. RxLedger enforces identity and scope independently of the model and executes controlled read-only operations. No arbitrary model-generated SQL, Python or database credentials are permitted.

For example, unique Lipitor patients across three months with monthly recurrence requires medication resolution, an explicit three-month window, dispensing records and stable internal patient identity. RxLedger should perform deduplication and recurrence analysis internally and return permitted aggregates. Do not export patient-level rows or broaden today's contract to answer this example. Dispense-line counts are not unique-patient counts.

### Separate Responsibilities

- Deterministic analytics and safety services own validated calculations and explicit policy rules.
- A maintained knowledge service owns licensed, versioned, traceable pharmaceutical evidence. RAG retrieves evidence; it does not guarantee correctness and is unnecessary for querying structured operational metrics.
- The model interprets requests, selects approved tools, asks clarifying questions and explains evidence. Ollama hosts this replaceable model; Ollama is not Rai itself.
- RxLedger owns operational enforcement, pharmacist approval, final labels and immutable decision records. A chat response must never be the sole enforcement point for a dispensing block.

Clinical examples in the discussion are design scenarios, not approved clinical rules. Release requires professional validation of medication, formulation, patient context, jurisdiction and institutional policy. Do not encode blanket drug-class instructions or universal override permissions.

### Delivery Order and Exit Gates

1. **Complete the BI connection foundation.** Implement verified sign-in, consent, delegated access and revocation; then Rai-owned conversation persistence. Prove denied roles, expired sessions and cross-tenant/branch requests cannot retrieve data. Current production chat is intentionally blocked pending this handoff.
2. **Prove the local model path.** Install and verify Ollama, select a model that fits measured hardware, and test chat, structured plans, timeouts and malformed tool calls. Run this alongside the connection work using synthetic data. A Vercel server cannot reach a user's localhost; deployment needs a separately authenticated private inference service or a deliberately local Rai backend. No public unauthenticated Ollama endpoint or silent paid/cloud fallback.
3. **Deliver flexible, verifiable BI.** Replace keyword-only routing with schema-validated analytical plans and approved general tools. Add authorized branch discovery, date interpretation, follow-up context and deterministic calculations. Start with inventory and dispensing aggregates, then sales/profit when historical transaction data supports them. Every result carries scope, units, definitions, freshness and limitations.
4. **Gate the beta on evaluation.** Test greetings, ambiguity, recurrence, missing records, access denial, prompt injection and tool failure against known answers. Measure latency and memory on target hardware; reject fabricated metrics or unauthorized results. Add privacy-safe audit events, bounded queries and permission-aware reports before rollout.
5. **Add deterministic safety as a separate release.** Validate batch/quantity/expiry checks and other approved rules with pharmacy reviewers. Define alert severity, non-overridable versus authorized-review policies and audit records for user, reason, action, timestamp and rule version. Start in shadow mode and evaluate missed events and alert fatigue before workflow enforcement.
6. **Establish knowledge before smart labels.** Secure permitted, current sources and validated medication-specific rules before patient-specific instruction generation. Require safety checks, provenance and pharmacist accept/edit/remove before RxLedger prints the approved label. The discussion lists labels before the knowledge engine; evidence must precede any knowledge-dependent label feature.
7. **Expand after validation.** Introduce proactive event-driven review, alert-quality analytics, longitudinal context and additional pharmacy/EMR adapters. Each new patient-data use or write capability needs a separately approved access contract, retention policy and safety evaluation.

### Stack and Scope Decisions

Keep the existing TypeScript application and server-side model adapter. Python/NumPy/pandas may be added behind typed service contracts when validated analytics require them; they are not prerequisites for conversational intelligence and do not automatically improve inference latency. Local models reduce API dependence but still have hardware, maintenance and evaluation costs.

The current access contract remains read-only and excludes patient identifiers. Future clinical context, safety audit summaries and instruction plans are roadmap items, not permissions granted by this vision. Broader data sharing requires explicit authorization and minimisation; never send raw audit logs or clinical records to a model by default.
