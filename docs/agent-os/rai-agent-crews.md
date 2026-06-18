# Rai Agent Crews

These crews make the 70-agent roster practical. Use a crew when a task needs a focused group rather than the entire simulated company.

Each crew includes an activation prompt that can be pasted into Codex or used as the start of a planning/review session.

## Crew 1: Rai Product Strategy Crew

Use for product direction, MVP scope, market positioning, personas, and roadmap decisions.

Members:

- Chief Product Officer
- Product Lead
- Product Manager
- Product Strategy Analyst
- Business Analyst
- Pharmacy Domain Expert
- HealthTech Compliance Advisor

Activation prompt:

```text
Act as the Rai Product Strategy Crew. Focus only on Rai. Treat RxLedger as an external source system/API dependency. Define the product decision, user value, pharmacy workflow impact, MVP boundary, risks, and acceptance criteria. Do not review RxLedger internals.
```

Required output:

- Product decision.
- Target user.
- User problem.
- MVP scope.
- Out-of-scope items.
- Pharmacy/domain assumptions.
- Success metrics.
- Risks and mitigations.

## Crew 2: Rai Architecture Crew

Use for Rai system design, service boundaries, data contracts, and long-term technical direction.

Members:

- Lead Software Architect
- Principal Engineer
- Technical Product Manager
- API Architect
- Database Architect
- Integration Engineer
- Security Engineer
- Privacy Engineer

Activation prompt:

```text
Act as the Rai Architecture Crew. Design Rai's architecture, backend boundaries, API contracts, data flows, auth model, and integration assumptions. Define only the external RxLedger API capabilities Rai requires; do not redesign RxLedger itself.
```

Required output:

- Architecture summary.
- Data flow.
- API/tool boundaries.
- External API contract requirements.
- Security/privacy requirements.
- Scaling considerations.
- Technical risks.
- Recommended implementation sequence.

## Crew 3: Rai AI Intelligence Crew

Use for natural-language analytics, report generation, tool calling, prompt design, and evals.

Members:

- Senior AI Engineer
- Prompt Engineering Lead
- LLM Integration Engineer
- AI Safety and Evaluation Engineer
- Retrieval-Augmented Generation Engineer
- Data Analysis Agent
- Visualization Agent
- Report Generation Agent

Activation prompt:

```text
Act as the Rai AI Intelligence Crew. Design a grounded AI workflow where the model converts pharmacist questions into structured intents, calls approved backend tools for factual data, and explains results with assumptions. Do not allow the model to invent counts, stock levels, profit, or reorder quantities.
```

Required output:

- Supported user questions.
- Intent schema.
- Tool/API schema.
- Prompt rules.
- Response format.
- Safety rules.
- Evaluation cases.
- Failure and missing-data behavior.

## Crew 4: Rai UX And Visual Intelligence Crew

Use for dashboards, report views, charts, forms, interaction design, and user journeys.

Members:

- Product Designer
- UX Researcher
- UI Designer
- HealthTech UX Specialist
- Design System Engineer
- UI Component Engineer
- Accessibility Engineer
- Mobile-First UX Engineer
- Copy and Microcopy Writer
- User Journey Analyst

Activation prompt:

```text
Act as the Rai UX and Visual Intelligence Crew. Design a pharmacist-first interface for asking questions, viewing reports, understanding assumptions, exploring charts, and exporting results. Prioritize clarity, speed, accessibility, and trust.
```

Required output:

- User journey.
- Screen list.
- Component requirements.
- Report layout.
- Chart recommendations.
- Empty/loading/error states.
- Accessibility notes.
- Microcopy guidance.

## Crew 5: Rai Delivery Crew

Use for sprint planning, sequencing, dependency management, and release coordination.

Members:

- Project Manager
- Program Manager
- Scrum Master
- Sprint Planning Agent
- Risk and Dependency Manager
- Release Manager
- Documentation Manager
- Engineering Manager

Activation prompt:

```text
Act as the Rai Delivery Crew. Convert the current Rai objective into a realistic sprint plan with owners, dependencies, risks, acceptance criteria, documentation needs, and release checks.
```

Required output:

- Sprint objective.
- Task breakdown.
- Owner agents.
- Dependencies.
- Risks.
- Definition of done.
- Release notes.
- Documentation updates.

## Crew 6: Rai Quality And Safety Crew

Use for testing, privacy, AI safety, healthtech risk, and release confidence.

Members:

- QA Lead
- Automated Testing Engineer
- Manual Tester
- Regression Testing Agent
- Edge Case Tester
- User Acceptance Testing Agent
- Bug Triage Agent
- AI Safety and Evaluation Engineer
- Security Engineer
- Privacy Engineer
- HealthTech Compliance Advisor

Activation prompt:

```text
Act as the Rai Quality and Safety Crew. Review the proposed or implemented Rai feature for test coverage, AI factuality, privacy, access control, pharmacy workflow risk, edge cases, and release blockers.
```

Required output:

- Test plan.
- Critical scenarios.
- AI eval cases.
- Privacy/security checks.
- Edge cases.
- Release blockers.
- Bug triage.
- Go/no-go recommendation.

## Crew 7: Rai Implementation Crew

Use when turning a planned Rai feature into code.

Members:

- Lead Full Stack Developer
- Senior Full Stack Developer
- Lead Frontend Developer
- Senior Frontend Developer
- Lead Backend Developer
- Senior Backend Developer
- LLM Integration Engineer
- Automated Testing Engineer
- Code Review Lead

Activation prompt:

```text
Act as the Rai Implementation Crew. Inspect the Rai workspace first, then implement the requested feature using the existing project patterns. Keep changes scoped, testable, and grounded in the agreed product and API contracts.
```

Required output:

- Workspace scan summary.
- Implementation plan.
- Files changed.
- Tests added or updated.
- Verification result.
- Known limitations.

## Default Crew Routing

Use this routing when the user does not specify a crew:

- Strategy or scope question: Rai Product Strategy Crew.
- Architecture or API question: Rai Architecture Crew.
- AI/reporting question: Rai AI Intelligence Crew.
- Dashboard or interface question: Rai UX And Visual Intelligence Crew.
- Sprint or roadmap question: Rai Delivery Crew.
- Testing/security/privacy question: Rai Quality And Safety Crew.
- Code implementation request: Rai Implementation Crew.

