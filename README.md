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

## Running the first vertical slice

This repository implements the first end-to-end engagement slice:

```text
Create engagement → Agency Manager plan → Session Auditor → Workflow Coach
→ Quality Reviewer (one revision loop) → Manual approval → Real GitHub issue
```

### Prerequisites

- Node.js 22 (`nvm use 22`)

### Install and run

```bash
nvm use 22
npm install
npm run dev        # http://localhost:3000
```

Open the app, click **Load sample engagement**, then **Start audit**. You land on
`/runs/[id]` with the persisted agency plan, the full agent trace (tokens, cost,
latency), the reviewer decision (one revision, then approval), the draft report,
and a manual **Approve & publish to GitHub** gate.

### Quality gates

```bash
npm test           # Vitest unit tests (TDD for all behavioral code)
npm run lint       # ESLint (next/core-web-vitals)
npm run typecheck  # tsc --noEmit
npm run build      # next build
```

All four run offline with no external credentials.

### Model execution

Model access goes through a single injectable adapter (`lib/ai/client.ts`) and
every response is Zod-validated with one retry (`lib/ai/structured-output.ts`).

- **Fixture mode (default, `MIZAN_MODEL_MODE=fixture`)** — deterministic demo
  responses that reflect the submitted title and objective. Used by tests and the
  offline demo. No API key is required, and fixture-generated reports are blocked
  from real GitHub publication.
- **Real mode (`MIZAN_MODEL_MODE=openai`)** — calls an OpenAI-compatible provider
  using `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `MIZAN_MODEL`. These are read
  server-side only and are never exposed to the browser.

Both paths return the same raw-response shape and flow through the identical
validation + tracing code, so nothing bypasses validation.

The server also enforces `MIZAN_MODEL_TIMEOUT_MS` and
`MIZAN_MODEL_MAX_OUTPUT_TOKENS`. Intake requests are bounded by
`MIZAN_RATE_LIMIT_PER_MINUTE`, field-size validation, and the deployment-level
`MIZAN_MAX_ENGAGEMENT_BUDGET_USD` ceiling. The built-in limiter is process-local
and intended for the single-instance hackathon deployment, not distributed abuse
protection.

### GitHub publication

Publication is a separate server action gated on reviewer approval, an unguessable
per-engagement publication capability, and—when configured—a recorded manual
approval. It creates a real issue through the GitHub REST API using a server-only
`GITHUB_TOKEN`.

- Set `MIZAN_GITHUB_REPOSITORY_ALLOWLIST` to a comma-separated list of permitted
  `owner/repo` targets. A submitted repository outside this list cannot use the
  deployment's shared token.
- With `GITHUB_TOKEN` set, the target allowlisted, and real model mode enabled,
  the approval button creates a real issue and stores its number and URL.
- Without those prerequisites, the UI shows a clear error and **no issue URL is
  ever fabricated**.
- Publication claims are atomic: repeated or concurrent approvals cannot create
  duplicate requests through the normal application path.

### Persistence and Convex

The app uses the in-memory store (`lib/store/`) only when no Convex deployment
URL is configured, keeping tests and the offline demo runnable. The **real**
Convex schema and functions live under `convex/` (`schema.ts`, `engagements.ts`,
`plans.ts`, `agentSteps.ts`, `artifacts.ts`) and are the source of truth for the
deployed backend. To provision Convex:

```bash
npx convex dev     # logs in, creates a deployment, generates convex/_generated
```

The CLI writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. On the next server
start, `getStore()` automatically selects `lib/store/convex-store.ts`, so
engagements, plans, traces, and artifacts persist in that deployment. `convex/`
is excluded from the Next.js typecheck/build because its generated types only
exist after `convex dev`; run `npx convex dev --once` to validate and deploy the
backend functions.

All server-used Convex functions require `MIZAN_CONVEX_SERVER_SECRET`. Set the
same random value in `.env.local` and the Convex deployment environment; the app
fails closed if a Convex URL is configured without it. Publication capabilities
are stored only as hashes, while the plaintext value remains in an HTTP-only,
`SameSite=strict` per-engagement cookie.

### Environment variables

See `.env.example` for the full list (names only). All secrets stay server-side.

