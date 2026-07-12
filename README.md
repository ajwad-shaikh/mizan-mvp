# Mizan

> **An AI enablement agency that helps engineering teams get better outcomes from coding agents with less rework, stronger context, and controlled AI spend.**

Software engineering is becoming inseparable from AI, but most organisations still cannot answer a basic question:

> Are developers using AI effectively, or merely consuming more AI compute?

Mizan audits developer–AI coding sessions, investigates the surrounding codebase, identifies missing or wasteful context, improves the way the task should have been delegated, and publishes an actionable playbook directly into GitHub.

It is not a prompt scorer or another coding chatbot. Mizan is designed to perform the work of an **AI enablement consulting agency**.

## How it works

1. A user submits an AI coding conversation, task objective, and public GitHub repository.
2. An Agency Manager creates a task-specific audit plan and selects the necessary specialists.
3. Specialist agents inspect the conversation, repository context, external evidence, and estimated AI usage.
4. A Workflow Coach produces an improved prompt, context bundle, verification plan, and reusable playbook.
5. A Quality Reviewer checks every recommendation and may request a revision.
6. After user approval, Mizan publishes the final audit as a real GitHub issue.

```text
Agency Manager
├── Session Auditor
├── Context Investigator
│   ├── GitHub repository inspection
│   └── External research
├── Efficiency Analyst
└── Workflow Coach
        ↓
Quality Reviewer
        ↓
User Approval
        ↓
GitHub Publisher
```

## What Mizan produces

Each engagement can include:

* An executive audit summary
* Evidence-backed findings
* An improved initial prompt
* A recommended repository context bundle
* A better task decomposition
* A verification plan
* Estimated avoidable AI usage
* A reusable team playbook
* A complete agent trace with tokens, cost, and latency
* A published GitHub issue

## Core principle

Mizan does not reward developers for using less AI.

It helps teams reach a trustworthy engineering outcome with the **minimum necessary AI effort**.

## Hackathon MVP

The MVP focuses on one complete workflow:

```text
Submit coding session
→ Plan audit
→ Investigate session and repository
→ Produce recommendations
→ Review and revise
→ Approve
→ Publish to GitHub
```

The product intentionally excludes authentication, billing, private repository OAuth, IDE extensions, autonomous code changes, pull requests, and organisation-wide developer scoring.

## Technology

* **Agent runtime:** Hermes
* **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui
* **Backend and persistence:** Convex
* **Repository investigation and delivery:** GitHub API
* **External research:** Linkup
* **Deployment:** Cloudflare
* **Structured validation:** Zod

## Project documents

The complete product specification, agent contracts, data model, application structure, evaluation plan, and time-boxed implementation sequence are available in:

```text
docs/IMPLEMENTATION_PLAN.md
```

## Development priorities

1. Complete a real end-to-end engagement.
2. Publish a real GitHub issue.
3. Persist every agent step and handoff.
4. Dynamically select and skip specialist agents.
5. Support one reviewer revision cycle.
6. Add repository-backed evidence.
7. Expose token, cost, and latency traces.
8. Add evaluations and management controls.
9. Polish only after the full workflow works.

## Guiding philosophy

> We have linters, reviews, tests, and observability for source code. As AI interactions become part of software engineering, they deserve the same discipline.

Mizan is a first step towards making AI collaboration measurable, reviewable, and continuously improvable.

