# Rai Sprint 0 And Sprint 1 Plan

## Sprint 0: Product And Technical Foundation

Goal: define Rai clearly enough to begin implementation safely.

Duration: 1 week.

Owner crew: Rai Product Strategy Crew plus Rai Architecture Crew.

### Tasks

| Task | Owner agent | Output |
| --- | --- | --- |
| Confirm Rai MVP scope | Product Manager | Approved MVP boundary |
| Define primary personas | UX Researcher | Persona notes |
| Define first report templates | Business Analyst | Report list and metrics |
| Define external API needs | API Architect | API contract draft |
| Define AI intent types | Senior AI Engineer | Intent schema |
| Define privacy rules | Privacy Engineer | Data handling checklist |
| Define test strategy | QA Lead | Test coverage outline |

### Definition Of Done

- MVP blueprint exists.
- External API contract exists.
- AI intent/tool contract exists.
- Sprint 1 tasks can be estimated.

## Sprint 1: Rai MVP Skeleton

Goal: create the first working Rai skeleton around one end-to-end report flow.

Duration: 1-2 weeks.

Owner crew: Rai Implementation Crew.

### Recommended First Vertical Slice

Feature: unique patients on medication.

Why this first:

- It is central to the user's original Rai idea.
- It tests medication matching.
- It tests patient deduplication.
- It tests API/tool grounding.
- It gives pharmacists obvious value.

### Tasks

| Task | Owner agent | Output |
| --- | --- | --- |
| Scaffold Rai app | Lead Full Stack Developer | App structure |
| Add report question UI | Lead Frontend Developer | Natural-language input screen |
| Add structured intent parser | LLM Integration Engineer | Intent parser for unique patient count |
| Add backend tool interface | Lead Backend Developer | Tool adapter contract |
| Add mock external API response | Senior Backend Developer | Test fixture data |
| Render answer with assumptions | AI Web Developer | Grounded answer component |
| Add table/chart output | Visualization Agent | Result view |
| Add tests | Automated Testing Engineer | Unit and integration tests |
| Review privacy and safety | Privacy Engineer | Safety notes |

### Definition Of Done

- User can ask: "How many unique patients are on Exforge 10/160 in March?"
- Rai returns a structured answer from mock/tool data.
- Rai shows date range, medication match, deduplication rule, and warnings.
- Tests cover duplicate patient handling.
- No answer is generated without tool data.

## Sprint 2 Candidate

Feature: medication category usage report.

Example:

```text
Generate a report on total antihypertensives dispensed in March.
```

Key work:

- Medication category mapping.
- Usage totals.
- Revenue/profit display.
- CSV export.
- Chart by medication.

