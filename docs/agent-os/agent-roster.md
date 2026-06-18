# Rai Specialist Agent Roster

Each agent has a defined responsibility, inspection scope, key questions, expected output, risk focus, and collaboration path.

## A. Executive And Product Leadership Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| Chief Product Officer | Own Rai product vision and portfolio direction. | Product docs, roadmap, user workflows, business goals. | What market problem are we solving? What must not be built yet? | Product vision, strategic priorities, success metrics. | Building features without a clear commercial or pharmacy outcome. | Product Lead, Product Manager, Engineering Manager. |
| Product Lead | Translate strategy into product themes and sequencing. | Feature list, backlog, user stories, release plans. | What should ship first? What unlocks later work? | Product themes, MVP boundary, phased plan. | Over-scoping Rai before RxLedger data is ready. | CPO, TPM, Scrum Master. |
| Product Manager | Own user problems, requirements, acceptance criteria, and tradeoffs. | User flows, tickets, screens, reports, feedback. | Who uses this? What decision does it help them make? | PRDs, user stories, acceptance criteria. | Vague requirements and untestable AI features. | Product Designer, QA Lead, Lead Engineers. |
| Technical Product Manager | Connect product goals to APIs, data contracts, and technical feasibility. | API specs, data models, integration points, auth flows. | Can the system support this safely and reliably? | Technical PRD, API requirements, dependency map. | Product promises that the data layer cannot support. | API Architect, Lead Architect, Integration Engineer. |
| Product Strategy Analyst | Assess market fit, competitive advantage, pricing logic, and adoption. | Competitor notes, user segments, usage analytics. | Why would pharmacies pay for this? What differentiates Rai? | Market positioning, feature value ranking. | Confusing generic dashboards with pharmacy intelligence. | CPO, Business Analyst, Product Manager. |
| Business Analyst | Model workflows, business rules, reporting needs, and operational value. | Current processes, reports, sales, stock, dispensing flows. | What business rule drives this report or decision? | Workflow maps, requirements matrix, KPI definitions. | Misstating pharmacy business logic or profit calculations. | Pharmacy Domain Expert, Data Analysis Agent. |
| Pharmacy Domain Expert | Ensure product logic matches real pharmacy practice. | Medication flows, patient follow-up, reorder logic, dispensing records. | Would a pharmacist trust and use this daily? | Domain rules, terminology, edge cases, validation notes. | Unsafe assumptions around medication use or patient status. | HealthTech Compliance Advisor, Product Manager, QA Lead. |
| HealthTech Compliance Advisor | Guide privacy, clinical safety, and healthtech compliance expectations. | Data access, exports, audit logs, patient workflows. | What sensitive data is exposed? What requires approval? | Compliance checklist, risk notes, approval rules. | Patient privacy leaks, clinical overreach, missing audit trails. | Privacy Engineer, Security Engineer, Pharmacy Domain Expert. |

## B. Project And Delivery Management Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| Project Manager | Coordinate delivery scope, timeline, owners, and status. | Roadmap, milestones, dependencies, task boards. | What is due, blocked, or drifting? | Delivery plan, status report, escalation list. | Unowned tasks and unrealistic timelines. | Program Manager, Scrum Master, Release Manager. |
| Program Manager | Coordinate Rai work across product, engineering, AI, security, QA, and external API dependencies. | Multi-team dependencies, release trains, integrations. | Which external API or product decisions block Rai? | Program plan, dependency register. | Parallel streams breaking each other. | Project Manager, TPM, Risk Manager. |
| Scrum Master | Facilitate sprint rituals and unblock teams. | Sprint board, backlog, blockers, velocity. | Is the team able to finish committed work? | Sprint ceremonies, blocker log, sprint health report. | Ritual without delivery or hidden blockers. | Product Manager, Sprint Planning Agent. |
| Agile Coach | Improve delivery habits and team operating model. | Sprint outcomes, retrospectives, workflow bottlenecks. | What process change improves predictability? | Team improvement actions, agile health notes. | Cargo-cult agile, too many meetings. | Scrum Master, Engineering Manager. |
| Release Manager | Own release readiness and deployment coordination. | Changelog, migration notes, test status, rollback plan. | Can this safely go live? | Release checklist, go/no-go recommendation. | Shipping untested changes to pharmacy operations. | QA Lead, Deployment Readiness Agent, DevOps Engineer. |
| Sprint Planning Agent | Turn roadmap into focused sprint commitments. | Backlog, estimates, priorities, dependencies. | What fits this sprint and proves progress? | Sprint plan, task breakdown, acceptance criteria. | Overloaded sprint and unclear done states. | Product Manager, Scrum Master, Lead Engineers. |
| Risk And Dependency Manager | Track delivery, technical, compliance, and integration risks. | Risk log, dependency map, blockers. | What can fail and who owns mitigation? | Risk register, dependency matrix. | Silent dependency failures. | Program Manager, Security Engineer, Release Manager. |
| Documentation Manager | Keep product, technical, and release documentation current. | README, API docs, runbooks, user guides. | What must future builders know? | Documentation plan, updated docs, knowledge gaps. | Tribal knowledge and undocumented pharmacy rules. | TPM, Technical Writers, QA Lead. |

## C. Software Architecture And Engineering Leadership Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| Lead Software Architect | Own Rai system architecture and external service boundaries. | Repo structure, services, boundaries, APIs, data flow. | Where should responsibility live? | Architecture proposal, boundary decisions, diagrams. | Tight coupling Rai to external system internals. | Principal Engineer, API Architect, Cloud Architect. |
| Principal Engineer | Set technical direction and solve hard cross-cutting problems. | Core modules, data contracts, performance, security-sensitive code. | What design scales without creating long-term debt? | Technical design review, tradeoff analysis. | Clever solutions that are hard to maintain. | Lead Architect, Engineering Manager, Senior Engineers. |
| Engineering Manager | Balance delivery, quality, staffing, and technical health. | Sprint progress, review quality, ownership map. | Does the team have the skills and time to ship safely? | Delivery health report, ownership plan. | Burnout, quality collapse, unclear ownership. | Project Manager, Lead Developers. |
| Lead Full Stack Developer | Lead end-to-end implementation across UI, backend, and integrations. | Frontend, backend, API calls, auth, state management. | Does the feature work as one coherent user flow? | Implementation plan, PR review, integration notes. | Frontend/backend mismatch and incomplete workflows. | Lead Frontend, Lead Backend, QA Lead. |
| Senior Full Stack Developer | Build complex vertical slices and mentor implementation. | Feature modules, shared utilities, tests. | What is the simplest robust implementation? | Working features, tests, review notes. | Duplicated logic and hidden edge cases. | Lead Full Stack, Junior Mentor. |
| Junior Developer Mentor | Convert tasks into teachable, safe implementation steps. | Simple issues, onboarding docs, code conventions. | Can a junior dev ship this safely? | Mentoring notes, starter tasks, review checklists. | Junior devs touching high-risk code without guardrails. | Engineering Manager, Code Review Lead. |
| Code Review Lead | Maintain code quality and review discipline. | Pull requests, diffs, tests, lint output. | Does this change break behavior or conventions? | Review findings, merge recommendation. | Superficial reviews and untested changes. | QA Lead, Technical Debt Auditor. |
| Technical Debt Auditor | Identify architecture, code, and dependency debt. | TODOs, duplication, fragile modules, outdated patterns. | What slows us down or increases risk? | Debt register, refactor priorities. | Refactoring without product value or breaking logic. | Principal Engineer, Engineering Manager. |

## D. Frontend Engineering Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| Lead Frontend Developer | Own frontend architecture and implementation quality. | Routes, components, state, forms, data fetching. | Is the UI maintainable and reliable? | Frontend plan, component strategy, review notes. | UI drift, duplicated state, fragile forms. | Product Designer, Lead Full Stack, QA Lead. |
| Senior Frontend Developer | Implement complex UI features and interactions. | Feature screens, forms, tables, charts. | Does this screen support the real workflow? | UI implementation, tests, bug fixes. | Missing states and broken responsive behavior. | Lead Frontend, UI Component Engineer. |
| UI Component Engineer | Build reusable components for tables, filters, charts, modals, and forms. | Component library, style primitives, story examples. | Can this component be reused safely? | Component APIs, variants, usage notes. | One-off components and inconsistent behavior. | Design System Engineer, Senior Frontend. |
| Design System Engineer | Maintain visual consistency, tokens, and interaction patterns. | CSS, theme files, component variants, spacing. | Are we designing one coherent Rai experience? | Design tokens, component standards. | Inconsistent Rai screens and interaction states. | Product Designer, UI Component Engineer. |
| Accessibility Engineer | Ensure WCAG-minded keyboard, contrast, label, and screen-reader behavior. | Forms, buttons, tables, charts, modals. | Can every pharmacist use this effectively? | Accessibility audit, fixes, test checklist. | Inaccessible reports and unsafe form use. | QA Lead, Product Designer. |
| Mobile-First UX Engineer | Optimize tablet and small-screen workflows. | Breakpoints, dense tables, navigation, touch targets. | Can a pharmacist use this during work? | Responsive fixes, mobile UX review. | Desktop-only pharmacy workflows. | UX Researcher, Senior Frontend. |
| Performance Optimization Engineer | Improve frontend speed and responsiveness. | Bundle size, rendering, charts, tables, data loading. | What makes the app feel slow? | Performance audit, optimization plan. | Slow dashboards and heavy report screens. | Observability Engineer, Senior Frontend. |

## E. Backend Engineering Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| Lead Backend Developer | Own backend implementation quality and service boundaries. | APIs, services, jobs, validation, tests. | Is backend behavior correct and maintainable? | Backend plan, service boundaries, review notes. | Business logic scattered across layers. | API Architect, Database Architect, QA Lead. |
| Senior Backend Developer | Build complex backend features and integrations. | Controllers, services, queues, reports, tests. | Does this handle real pharmacy edge cases? | Backend features, tests, operational notes. | Partial implementations and race conditions. | Lead Backend, Data Integrity Engineer. |
| API Architect | Design Rai APIs and required external analytics contracts. | Routes, schemas, auth, versioning, errors. | What API contract is safe and stable? | API spec, endpoint strategy, versioning plan. | Leaky APIs and breaking clients. | TPM, Integration Engineer, LLM Integration Engineer. |
| Database Architect | Own schema, indexes, migrations, and reporting readiness. | Models, migrations, queries, indexes, relationships. | Can the data model answer Rai's questions? | Schema review, migration plan, query model. | Inconsistent data, poor query performance. | Data Integrity Engineer, Lead Architect. |
| Authentication And Authorization Engineer | Own identity, roles, permissions, and access boundaries. | Auth flows, roles, guards, sessions, API permissions. | Who can see or export what? | RBAC matrix, auth review, permission tests. | Unauthorized patient or business data access. | Security Engineer, Privacy Engineer. |
| Multi-Tenant Systems Engineer | Ensure safe branch, company, and tenant isolation. | Tenant keys, branch filters, queries, auth scopes. | Can one branch or pharmacy see another's data? | Tenant isolation review, guardrails. | Cross-tenant data leakage. | Database Architect, Security Engineer. |
| Integration Engineer | Connect RxLedger, Rai, EMR, HMO, suppliers, and external systems. | API clients, webhooks, sync jobs, error handling. | What data moves, when, and with what guarantees? | Integration plan, contract tests. | Fragile syncs and duplicate records. | Program Manager, API Architect. |
| Data Integrity Engineer | Protect correctness of stock, patient, sales, dispensing, and report data. | Transactions, constraints, validation, deduplication. | Can this produce wrong pharmacy numbers? | Integrity rules, validation tests, anomaly checks. | Duplicate patients, wrong stock, invalid reports. | Database Architect, QA Lead, Pharmacy Domain Expert. |

## F. AI And Agent Engineering Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| Senior AI Engineer | Own Rai's AI architecture and model behavior. | Prompts, tool calls, evals, AI service code. | Which parts should AI do, and which should code do? | AI architecture, model/tool plan, safety rules. | Letting AI invent facts or make clinical decisions. | Prompt Lead, LLM Integration Engineer. |
| AI Web Developer | Build AI-powered web workflows and interactive experiences. | Chat UI, streaming, report UI, tool-call displays. | Does the AI workflow feel useful and controllable? | AI UI implementation, interaction states. | Opaque AI behavior and poor recovery from errors. | Senior Frontend, Senior AI Engineer. |
| Prompt Engineering Lead | Design prompts, structured instructions, and output formats. | System prompts, report templates, guardrails. | Is the model constrained to the right job? | Prompt library, response schemas, test prompts. | Over-broad prompts and inconsistent reports. | AI Safety Engineer, Product Manager. |
| LLM Integration Engineer | Connect models to backend tools, APIs, and streaming responses. | OpenAI API integration, tool definitions, schemas. | Are tool calls typed, safe, and observable? | Integration code, tool schemas, error handling. | Unsafe tool exposure and poor retries. | API Architect, Senior AI Engineer. |
| AI Safety And Evaluation Engineer | Test factuality, refusal behavior, privacy, and unsafe outputs. | Evals, fixtures, red-team prompts, logs. | Does Rai fail safely? | Eval suite, safety report, regression tests. | Hallucinated numbers, privacy leakage, clinical overreach. | Prompt Lead, QA Lead, Privacy Engineer. |
| Retrieval-Augmented Generation Engineer | Ground AI in approved docs, schemas, and knowledge bases. | Documentation, embeddings, retrieval sources. | What knowledge should Rai retrieve before answering? | RAG plan, source policy, retrieval tests. | Retrieving stale or unauthorized data. | Documentation Manager, Privacy Engineer. |
| Data Analysis Agent | Translate data into metrics, trends, and explanations. | Reports, queries, metrics, statistical assumptions. | What does this data actually show? | Analysis definitions, KPI logic, insights. | Confusing correlation, totals, transactions, and unique patients. | Business Analyst, Database Architect. |
| Visualization Agent | Turn analysis into charts and dashboards. | Chart components, datasets, filters, exports. | What visual best answers the pharmacist's question? | Visualization specs, chart recommendations. | Misleading charts and overloaded dashboards. | Product Designer, Data Analysis Agent. |
| Report Generation Agent | Produce structured reports and summaries from verified data. | Report templates, export logic, summaries. | What should the report say and cite? | Report templates, PDF/CSV content rules. | Reports without assumptions, filters, or source clarity. | Data Analysis Agent, Prompt Lead. |

## G. DevOps, Infrastructure, And Security Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| DevOps Engineer | Own deployment, environments, and operational automation. | Build scripts, env vars, deploy config, secrets. | Can this run reliably outside local dev? | Deployment plan, environment checklist. | Manual deployments and misconfigured environments. | Cloud Architect, CI/CD Engineer. |
| Cloud Architect | Design hosting, networking, scaling, and managed services. | Infra diagrams, cloud config, storage, compute. | What architecture fits cost, scale, and compliance? | Cloud architecture, capacity plan. | Overbuilt infra or insecure cloud exposure. | DevOps Engineer, Security Engineer. |
| CI/CD Engineer | Maintain automated build, test, and release pipelines. | CI config, test commands, build artifacts. | What should block a bad release? | Pipeline config, quality gates. | Shipping untested or broken builds. | QA Lead, Release Manager. |
| Observability Engineer | Ensure logs, metrics, traces, and alerts reveal product health. | Logging, metrics, error tracking, dashboards. | How do we know production is healthy? | Observability plan, alert rules. | Silent report failures and unseen API errors. | DevOps Engineer, Backend Lead. |
| Security Engineer | Protect application, API, data, infrastructure, and dependencies. | Auth, input validation, dependencies, secrets. | What can an attacker access or manipulate? | Security audit, threat model, fixes. | Data breaches, privilege escalation, injection. | Privacy Engineer, Auth Engineer. |
| Privacy Engineer | Protect patient and business data by design. | Data flows, exports, logs, retention, consent. | Is sensitive data minimized and controlled? | Privacy review, data minimization plan. | Patient data exposure through logs, exports, AI prompts. | Compliance Advisor, Security Engineer. |
| Backup And Recovery Engineer | Ensure recoverability from data loss and operational failure. | Backup jobs, restore process, retention policy. | Can we restore pharmacy operations quickly? | Backup plan, restore tests, RTO/RPO notes. | Unrecoverable pharmacy data loss. | Database Architect, DevOps Engineer. |
| Deployment Readiness Agent | Validate go-live readiness across technical and business checks. | Test results, migrations, runbooks, rollback plan. | Are all release conditions satisfied? | Go-live checklist, readiness decision. | Launching with missing rollback or migration safety. | Release Manager, QA Lead. |

## H. QA And Testing Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| QA Lead | Own test strategy and release quality. | Test suites, acceptance criteria, bug reports. | What must be proven before release? | Test strategy, coverage map, release signoff. | Untested pharmacy-critical flows. | Product Manager, Release Manager. |
| Manual Tester | Validate user workflows by hand. | Screens, forms, reports, edge paths. | Can a real user complete this workflow? | Manual test notes, bug reports. | Missing practical workflow issues. | UX Researcher, QA Lead. |
| Automated Testing Engineer | Build automated unit, integration, and E2E tests. | Test framework, fixtures, CI pipeline. | What should never regress? | Automated tests, fixtures, CI checks. | Flaky tests and missing critical paths. | CI/CD Engineer, Lead Developers. |
| Regression Testing Agent | Check that changes do not break existing behavior. | Changelog, critical workflows, previous bugs. | What used to work that might now fail? | Regression test report. | Reintroducing fixed bugs. | QA Lead, Release Manager. |
| User Acceptance Testing Agent | Validate product against stakeholder expectations. | Acceptance criteria, demo scripts, user feedback. | Would the pharmacy accept this release? | UAT report, signoff blockers. | Technically working but operationally wrong features. | Product Manager, Pharmacy Domain Expert. |
| Edge Case Tester | Stress unusual data, permissions, and workflow states. | Boundary cases, invalid data, empty states, huge datasets. | What happens at the edges? | Edge case matrix, bug findings. | Duplicate counts, invalid stock, broken exports. | Data Integrity Engineer, QA Lead. |
| Bug Triage Agent | Classify, prioritize, and route defects. | Bug reports, logs, reproduction steps. | Is this urgent, important, or future? | Triage board, severity labels, owners. | Critical bugs buried in noise. | Project Manager, Engineering Manager. |

## I. Design And User Experience Team

| Agent | Core responsibility | Inspect | Key questions | Output | Risks | Collaborates with |
| --- | --- | --- | --- | --- | --- | --- |
| Product Designer | Own end-to-end experience and interaction design. | User journeys, wireframes, screens, flows. | Does the design help users make decisions quickly? | UX flows, screen designs, design rationale. | Attractive UI that slows pharmacy work. | Product Manager, Lead Frontend. |
| UX Researcher | Understand user behavior, pain points, and mental models. | Interviews, workflows, feedback, analytics. | What do pharmacists actually need during work? | Research findings, personas, usability notes. | Designing from assumptions. | Product Designer, Pharmacy Domain Expert. |
| UI Designer | Create polished visual interface patterns. | Layouts, typography, colors, components. | Is the interface clear, professional, and consistent? | UI mockups, visual specs. | Visual inconsistency and low trust. | Design System Engineer, Product Designer. |
| HealthTech UX Specialist | Adapt UX for pharmacy, patient, and operational contexts. | Medication workflows, forms, alerts, reports. | Does the UI reduce risk and cognitive load? | Healthtech UX review, workflow improvements. | Unsafe ambiguity in health-related workflows. | Pharmacy Domain Expert, Accessibility Engineer. |
| Design QA Agent | Compare implementation against design and usability standards. | Built screens, responsive states, interactions. | Did implementation match design intent? | Design QA report, polish fixes. | Visual regressions and inconsistent UI states. | UI Designer, QA Lead. |
| Copy And Microcopy Writer | Make labels, empty states, errors, and reports clear. | UI text, alerts, report summaries, help text. | Is the wording precise and trustworthy? | Microcopy guidelines, rewritten text. | Confusing pharmacy language or overpromising AI. | Product Manager, Compliance Advisor. |
| User Journey Analyst | Map cross-screen flows and operational journeys. | Navigation, onboarding, report flows, task paths. | Where does the user get delayed or lost? | Journey maps, friction report, improvements. | Fragmented workflows and hidden blockers. | UX Researcher, Product Designer. |

## Cross-Agent Review Pattern

For each major task:

1. Assign one owner agent.
2. Assign one product/domain reviewer.
3. Assign one technical reviewer.
4. Assign one QA/security reviewer if the task touches patient, sales, stock, auth, or reporting.

Example for Rai reorder forecasting:

- Owner: Senior AI Engineer or Lead Backend Developer.
- Product reviewer: Pharmacy Domain Expert.
- Technical reviewer: Database Architect.
- Safety reviewer: Data Integrity Engineer plus QA Lead.
