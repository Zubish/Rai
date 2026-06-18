# Rai Agent OS

This folder turns the shared "Software Team Agent Roles" conversation into a reusable operating system for Rai work only.

RxLedger appears here only as Rai's external source system/API dependency. Any direct RxLedger work belongs in a separate workspace.

## Files

- `agent-roster.md` defines every requested specialist agent.
- `workflows.md` defines Rai-only build, delivery, and release workflows.
- `rai-agent-crews.md` defines executable Rai crews that can be invoked for real work.
- `rai-product-implications.md` explains what the agent framework means for Rai's product strategy.

## Starter Product Artifacts

- `../product/rai-mvp-blueprint.md` defines Rai's MVP scope, personas, features, non-goals, and acceptance criteria.
- `../architecture/external-rxledger-api-contract.md` defines the external API capabilities Rai needs from RxLedger.
- `../ai/rai-ai-intent-and-tool-contracts.md` defines supported AI intents, tool contracts, response format, and eval cases.
- `../delivery/rai-sprint-0-and-1-plan.md` defines the first two Rai delivery sprints.
- `../delivery/rai-agent-execution-log.md` records how the Rai crews were applied during implementation phases.

## How To Use

- For Rai planning, start with the Executive/Product, AI, Backend, Data, Security, UX, and QA agents.
- For implementation, assign one owner agent and two reviewer agents per task.
- For high-risk pharmacy workflows, include HealthTech Compliance Advisor, Privacy Engineer, Data Integrity Engineer, QA Lead, and Pharmacy Domain Expert.
- For RxLedger dependency work, document only the API contract Rai needs; do not inspect or redesign RxLedger internals here.

## Recommended Start

1. Read `../product/rai-mvp-blueprint.md`.
2. Confirm or edit `../architecture/external-rxledger-api-contract.md`.
3. Use `rai-agent-crews.md` to choose the right crew for the next task.
4. Start implementation with the Sprint 1 vertical slice in `../delivery/rai-sprint-0-and-1-plan.md`.
