# Demo Run — First Vertical Slice

This document records the verified state of the first vertical slice and its
honest limitations.

## What is implemented and verified

- **Engagement intake** — validated Zod schema (`lib/engagements/schema.ts`),
  client form with inline errors, privacy warning, and a "Load sample" action.
- **Dynamic agency plan** — the Agency Manager selects the Session Auditor and
  Workflow Coach and skips the Context Investigator and Efficiency Analyst with
  reasons; produces task-specific acceptance criteria.
- **Core agents** — Session Auditor, Workflow Coach, and Quality Reviewer, each
  with a distinct prompt, schema, and responsibility, all flowing through the
  validated model wrapper.
- **One reviewer revision loop** — the reviewer requests exactly one revision,
  routed back to the Workflow Coach, then approves. A second rejection stops
  before publication (`review_failed`).
- **Persistence & trace** — every agent step is stored with input, output,
  version, latency, tokens, and estimated cost, and rendered as an expandable
  trace on `/runs/[id]`.
- **Manual approval gate** — a separate server action gated on both reviewer
  approval and a recorded manual approval.
- **GitHub publication** — real GitHub REST issue creation from the approved
  report's deterministic Markdown.

## How the run was exercised

- `npm test` — 54 unit tests pass, including the full orchestration paths
  (approved, one revision, second rejection) and the end-to-end service flow
  (`startEngagement` → `awaiting_approval` → `approveAndPublishEngagement`
  publishing through a fake GitHub API and marking the engagement `completed`).
- `npm run lint`, `npm run typecheck`, `npm run build` — all pass offline.
- The production server boots; `/` renders the intake form, `/runs` lists
  engagements, and an unknown run id returns 404.

## Honest limitations

- **No live GitHub issue was created during verification** because no
  `GITHUB_TOKEN` was configured in this environment. The publish path is
  implemented and unit-verified against a fake GitHub client; the markdown
  rendering is deterministic and tested. With a valid token set, the
  "Approve & publish" button creates a real issue and stores its number and URL.
  No issue URL is fabricated when a token is absent.
- **Convex is not provisioned here.** The app runs on the in-memory store; the
  Convex schema/functions under `convex/` are real, deploy-ready source compiled
  by `npx convex dev` (which requires a Convex login/deployment).
- **Model calls run in fixture mode by default**, producing deterministic output
  tuned to the retry sample. Real model output is supported via
  `MIZAN_MODEL_MODE=openai` with provider credentials.
- The in-memory store is process-local; restarting the server clears
  engagements. Convex provides durable persistence when wired.

## Deferred (per plan) until the slice is stable

Context Investigator, Efficiency Analyst, Linkup research, evaluation suite,
settings, proof dashboard, Cloudflare deployment, and visual polish.
