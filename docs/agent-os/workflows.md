# Rai Workflows

This file defines Rai-only workflows.

RxLedger is treated as an external source system. These workflows may define the RxLedger API capabilities Rai needs, but they must not inspect, review, or redesign RxLedger internals.

## Workflow 1: Build Rai From Scratch

### Phase 0: Discovery

Agents: Chief Product Officer, Product Lead, Product Manager, Pharmacy Domain Expert, Business Analyst, Lead Software Architect, HealthTech Compliance Advisor.

Outputs:

- Rai product vision.
- Primary personas: superintendent pharmacist, branch pharmacist, pharmacy owner, inventory manager, operations lead, finance/admin user.
- Top pharmacy intelligence use cases.
- External data dependency map for RxLedger API needs.
- MVP success criteria.

Key decisions:

- Rai is an intelligence layer, not a replacement for RxLedger.
- RxLedger remains the external source of truth.
- Rai answers must be grounded in approved analytics APIs or deterministic Rai services.
- AI may explain, summarize, and guide, but numbers must come from deterministic data operations.

### Phase 1: Rai Data And API Contract Foundation

Agents: API Architect, Database Architect, Integration Engineer, Data Integrity Engineer, Authentication and Authorization Engineer, Privacy Engineer, Security Engineer, LLM Integration Engineer.

Outputs:

- Rai backend boundary.
- Required RxLedger analytics API contract.
- Read-only analytics endpoint requirements.
- Role-based access plan.
- Audit logging plan.
- Medication normalization rules.
- Unique patient counting rules.
- Drug category/classification strategy.

Required external API capabilities:

- Medication usage report.
- Unique patients on medication.
- Medication class/category report.
- Sales and profit summary.
- Reorder forecast inputs.
- Stockout risk inputs.
- Expiry risk inputs.
- Slow-moving stock inputs.

### Phase 2: Rai MVP

Agents: Lead Full Stack Developer, Lead Frontend Developer, Lead Backend Developer, Senior AI Engineer, Prompt Engineering Lead, Product Designer, QA Lead.

MVP features:

- Natural-language question box.
- Report template picker.
- Medication usage reports.
- Unique patient medication counts.
- Sales/profit summary.
- Basic reorder forecast.
- Chart visualizations.
- PDF/CSV export.
- Admin/pharmacist access controls.
- Explanation panel showing assumptions and query scope.

### Phase 3: AI Grounding And Safety

Agents: Senior AI Engineer, LLM Integration Engineer, AI Safety and Evaluation Engineer, Retrieval-Augmented Generation Engineer, Data Analysis Agent, Report Generation Agent.

Rules:

- Convert questions into structured intents.
- Use backend tools for factual numbers.
- Return confidence, filters, assumptions, and missing data warnings.
- Never invent patient counts, stock levels, profit, or reorder quantities.
- Do not make final clinical decisions.
- Do not edit stock, prices, patients, or dispensing records.
- Any future write action must require explicit pharmacist approval and audit logging.

### Phase 4: Visual Intelligence

Agents: Visualization Agent, Product Designer, UI Designer, Design System Engineer, Accessibility Engineer, Performance Optimization Engineer.

Outputs:

- Dashboard layout.
- Report visualization patterns.
- Chart components.
- Drill-down views.
- Empty, loading, error, and permission states.
- Mobile-first review for pharmacists using tablets or smaller laptops.

### Phase 5: Testing And Release

Agents: QA Lead, Automated Testing Engineer, Regression Testing Agent, Edge Case Tester, Release Manager, Deployment Readiness Agent, Observability Engineer.

Checks:

- Unit tests for query intent parsing and calculations.
- Contract tests for expected RxLedger API responses.
- Integration tests for Rai API calls.
- E2E tests for report generation.
- Permission tests for role-based access.
- Duplicate patient-count tests.
- Export tests for PDF/CSV.
- Audit-log verification.
- Performance tests for large pharmacy datasets.

## Workflow 2: Rai Feature Delivery

Use this workflow for any individual Rai feature.

### Step 1: Define

Owner agents: Product Manager, Pharmacy Domain Expert, Technical Product Manager.

Output:

- Problem statement.
- User story.
- Acceptance criteria.
- Required data fields.
- Safety and privacy notes.

### Step 2: Design

Owner agents: Product Designer, Lead Software Architect, API Architect, Senior AI Engineer.

Output:

- User flow.
- Screen or component requirements.
- API/tool contract.
- AI intent and response schema.
- Error and empty-state behavior.

### Step 3: Build

Owner agents: Lead Full Stack Developer, Lead Frontend Developer, Lead Backend Developer, LLM Integration Engineer.

Output:

- Implementation plan.
- Code changes.
- Tool/API integration.
- Data validation.
- User-facing states.

### Step 4: Verify

Owner agents: QA Lead, Automated Testing Engineer, Edge Case Tester, AI Safety and Evaluation Engineer.

Output:

- Unit/integration/E2E checks.
- AI eval cases.
- Permission checks.
- Edge case report.
- Release recommendation.

## Workflow 3: Rai AI Report Generation

Use this workflow when creating a new report type or natural-language report feature.

### Step 1: Metric Definition

Agents: Product Manager, Business Analyst, Pharmacy Domain Expert, Data Analysis Agent.

Output:

- Metric name.
- Business meaning.
- Formula.
- Filters.
- Deduplication rules.
- Assumptions.

### Step 2: Data Contract

Agents: API Architect, Database Architect, Data Integrity Engineer, Privacy Engineer.

Output:

- Required API endpoint or tool.
- Request schema.
- Response schema.
- Permission requirements.
- Audit requirements.
- Data quality warnings.

### Step 3: AI Response Contract

Agents: Prompt Engineering Lead, LLM Integration Engineer, Report Generation Agent, AI Safety and Evaluation Engineer.

Output:

- Structured prompt.
- Tool-call schema.
- Report response format.
- Refusal and missing-data behavior.
- Eval examples.

### Step 4: Visualization And Export

Agents: Visualization Agent, Product Designer, UI Component Engineer, Accessibility Engineer.

Output:

- Chart type.
- Table columns.
- Summary cards.
- Export format.
- Accessibility checks.

## Workflow 4: Rai Release Readiness

Use this workflow before demo, pilot, or production release.

Agents: Release Manager, Deployment Readiness Agent, QA Lead, Security Engineer, Privacy Engineer, Observability Engineer, Product Manager.

Checklist:

- All MVP acceptance criteria are satisfied.
- Critical AI evals pass.
- Contract tests pass for external API assumptions.
- Role-based access tests pass.
- Patient/business data is not leaked into logs or prompts.
- Export permissions are enforced.
- Error tracking and logs are available.
- Rollback plan exists.
- Known limitations are documented.

