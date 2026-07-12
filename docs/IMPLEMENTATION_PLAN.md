# Mizan MVP — Implementation Plan

## 1. Product Summary

**Mizan** is an AI enablement agency for engineering teams.

It audits how developers use AI during coding tasks, investigates the context surrounding the task, identifies avoidable inefficiencies, produces an improved workflow, and publishes a structured audit into the team’s real engineering system.

The hackathon MVP should demonstrate that Mizan can replace a small AI enablement consulting engagement.

It must do more than score prompts.

A complete engagement should include:

1. Client intake
2. Session diagnosis
3. Repository investigation
4. Context-quality analysis
5. Prompt and workflow improvement
6. Cost and efficiency analysis
7. Quality review
8. Delivery to GitHub
9. Traceability of every agent action

---

# 2. Product Positioning

## One-line description

> Mizan is an AI agency that audits developer–AI interactions, improves how engineering work is delegated to AI, and delivers actionable playbooks directly into GitHub.

## Core promise

> Reach a trustworthy engineering outcome with the minimum necessary AI effort.

## Hackathon framing

Mizan should be presented as an **AI Enablement Agency**, not a prompt-analysis tool.

The replaced human function is:

> An AI consultant who reviews developer workflows, studies the codebase, identifies poor prompting and context practices, estimates waste, proposes better operating patterns, reviews the recommendations, and delivers a client-ready report.

---

# 3. Scope

## In scope

The MVP must support:

* Pasting an AI coding conversation
* Supplying a public GitHub repository
* Supplying a task objective
* Dynamic selection of specialist agents
* Repository investigation
* External research
* Prompt and context analysis
* Cost and efficiency estimation
* Improved prompt generation
* Workflow recommendations
* Reviewer approval or revision
* Manual approval before publishing
* Publishing a real GitHub issue
* Run history
* Agent trace tree
* Token, cost, and latency visibility
* Evaluation suite
* Persistent project memory
* Management controls

## Out of scope

Do not implement:

* Authentication
* Multiple organisations
* Billing
* IDE plugins
* Cursor integrations
* Browser extensions
* Private repository OAuth
* Autonomous code changes
* Pull request creation
* Vector databases
* Complex user permissions
* Streaming collaboration
* Long-term developer performance scoring
* Drag-and-drop agent builders
* Production-grade secret management
* Full pricing accuracy across all AI models

---

# 4. Primary User

The primary user is an:

* Engineering manager
* AI platform engineer
* Engineering productivity lead
* CTO
* Technical team lead

The user wants to answer:

* Why did this AI coding session require so many iterations?
* What context was missing?
* What context was unnecessary?
* Were the requirements clear?
* Did the developer use the correct AI workflow?
* How should the task have been delegated instead?
* How much AI usage may have been avoidable?
* Can this interaction become a reusable team playbook?

---

# 5. Primary User Flow

## Step 1: Create an engagement

The user enters:

* Engagement name
* Task objective
* AI conversation
* Public GitHub repository URL
* Optional expected outcome
* Optional token metadata
* Maximum estimated budget
* Strictness level
* Publishing target
* Whether final publication requires approval

## Step 2: Agency manager creates a plan

The Agency Manager reviews the engagement and decides:

* Which specialists are necessary
* Which specialists should be skipped
* What each specialist must investigate
* What acceptance criteria apply
* Whether external research is needed
* Whether repository evidence is mandatory

The plan must be generated dynamically.

Do not use an identical fixed pipeline for every engagement.

## Step 3: Specialists work

Selected specialists analyse the engagement.

Possible specialists:

* Session Auditor
* Context Investigator
* Efficiency Analyst
* Workflow Coach
* Quality Reviewer
* Deliverable Publisher

## Step 4: Quality review

The reviewer checks:

* Evidence quality
* Unsupported claims
* Contradictory recommendations
* Reusability of the improved prompt
* Accuracy of repository references
* Whether the report satisfies the manager’s acceptance criteria

The reviewer may approve or request one revision.

## Step 5: User reviews the deliverable

The user sees:

* Executive summary
* Findings
* Improved prompt
* Recommended context
* Estimated savings
* Repository evidence
* External sources
* Agent trace
* Cost and latency

## Step 6: Publish

After manual approval, Mizan creates a real GitHub issue.

The GitHub issue URL is stored and shown in the engagement.

---

# 6. Agency Design

## 6.1 Agency Manager

### Responsibility

Plan and supervise the engagement.

### Input

* Task objective
* Conversation
* Repository
* Available metadata
* Agency policies
* Previous engagement memory

### Output

```json
{
  "engagementSummary": "string",
  "selectedAgents": [
    {
      "agent": "session_auditor",
      "reason": "string",
      "instructions": ["string"]
    }
  ],
  "skippedAgents": [
    {
      "agent": "efficiency_analyst",
      "reason": "No token metadata was supplied."
    }
  ],
  "acceptanceCriteria": [
    "Every repository-specific claim must cite a real repository file.",
    "The improved prompt must be directly reusable.",
    "Estimated savings must be labelled as estimates."
  ],
  "requiresExternalResearch": true,
  "requiresRepositoryEvidence": true
}
```

### Behaviour

The manager must:

* Select only relevant agents
* Explain why each agent is needed
* Skip unnecessary agents
* Define acceptance criteria
* Review final specialist outputs
* Send the work to the Quality Reviewer
* Approve publication only after review

---

## 6.2 Session Auditor

### Responsibility

Reconstruct what happened in the conversation.

### Analyse

* Initial objective
* Final objective
* Number of user turns
* Number of AI responses
* Requirement changes
* Corrective turns
* Repeated instructions
* Contradictions
* Abandoned approaches
* Whether planning happened before implementation
* Whether verification was performed

### Output

```json
{
  "initialObjective": "string",
  "finalObjective": "string",
  "summary": "string",
  "userTurns": 0,
  "assistantTurns": 0,
  "correctiveTurns": 0,
  "requirementChanges": [
    {
      "turn": 0,
      "change": "string",
      "impact": "string"
    }
  ],
  "strengths": ["string"],
  "problems": [
    {
      "type": "missing_constraint",
      "severity": "high",
      "evidence": "string"
    }
  ],
  "verificationObserved": true
}
```

---

## 6.3 Context Investigator

### Responsibility

Determine whether the right information was supplied.

### Analyse

* Missing repository context
* Irrelevant context
* Missing interfaces
* Missing tests
* Missing architecture documentation
* Missing domain rules
* Missing operational constraints
* Potential repository files that should have been included
* Relevant official external documentation

### Tools

* GitHub repository API
* Linkup search

### Requirements

Every repository-specific recommendation must include evidence.

Example:

```json
{
  "missingContext": [
    {
      "item": "RetryPolicy interface",
      "reason": "The task modifies retry behaviour.",
      "repositoryEvidence": {
        "path": "internal/retry/policy.go",
        "url": "https://github.com/..."
      }
    }
  ],
  "irrelevantContext": [
    {
      "item": "metrics.go",
      "reason": "No metric behaviour was changed."
    }
  ],
  "externalEvidence": [
    {
      "title": "Official retry guidance",
      "url": "https://...",
      "relevance": "Supports retry classification recommendation."
    }
  ],
  "recommendedContextBundle": [
    "internal/retry/policy.go",
    "internal/retry/policy_test.go",
    "docs/adr/017-retries.md"
  ]
}
```

---

## 6.4 Efficiency Analyst

### Responsibility

Estimate interaction cost and avoidable effort.

### Analyse

* Prompt count
* Estimated input tokens
* Estimated output tokens
* Model cost if metadata is available
* Repeated content
* Regeneration
* Unnecessary model escalation
* Likely avoidable turns
* Estimated avoidable cost
* Estimated avoidable latency

### Rules

* Clearly mark all estimates
* Do not pretend to know exact savings
* Prefer ranges
* Explain the basis of every estimate

### Output

```json
{
  "estimatedInputTokens": 0,
  "estimatedOutputTokens": 0,
  "estimatedCostUsd": 0,
  "avoidableTurns": 0,
  "estimatedAvoidableTokens": {
    "minimum": 0,
    "maximum": 0
  },
  "estimatedAvoidableCostUsd": {
    "minimum": 0,
    "maximum": 0
  },
  "primaryWasteDrivers": [
    {
      "driver": "Late acceptance criteria",
      "impact": "Three corrective turns"
    }
  ],
  "confidence": "medium"
}
```

---

## 6.5 Workflow Coach

### Responsibility

Turn the findings into a better operating workflow.

### Produce

* Improved initial prompt
* Recommended task decomposition
* Recommended context bundle
* Recommended verification plan
* Reusable team playbook
* Suggested model or tool strategy
* Specific behavioural coaching

### Improved prompt structure

The improved prompt should contain only relevant sections:

```text
Objective

Background

Relevant context

Requirements

Constraints

Non-goals

Acceptance criteria

Verification steps

Expected output
```

### Output

```json
{
  "improvedPrompt": "string",
  "recommendedWorkflow": [
    {
      "step": 1,
      "action": "Ask the model to inspect the current retry abstraction before proposing changes.",
      "reason": "Prevents incorrect architectural assumptions."
    }
  ],
  "verificationPlan": [
    "Run existing unit tests.",
    "Add tests for transient and permanent errors."
  ],
  "reusablePlaybook": {
    "name": "Retry Behaviour Change",
    "content": "string"
  },
  "coachingNotes": [
    "State business invariants before requesting implementation."
  ]
}
```

---

## 6.6 Quality Reviewer

### Responsibility

Prevent unsupported or low-quality recommendations from reaching the client.

### Review criteria

* Every repository claim has evidence
* External claims have sources
* Estimates are labelled
* The improved prompt is actionable
* Recommendations match the original objective
* No invented repository artifacts
* No contradictory guidance
* No unnecessary verbosity
* Acceptance criteria from the manager are satisfied

### Output

```json
{
  "status": "approved",
  "score": 0,
  "issues": [
    {
      "type": "unsupported_repository_claim",
      "description": "The report mentions RetryPolicy without repository evidence.",
      "requiredAction": "Add a repository citation."
    }
  ],
  "revisionInstructions": ["string"]
}
```

### Revision rules

* Maximum one revision cycle for the MVP
* Route the revision to the responsible specialist
* Record the original output and revised output
* Show the reviewer decision in the trace

---

## 6.7 Deliverable Publisher

### Responsibility

Create the final client-facing artifact and publish it.

### Output

The final GitHub issue should contain:

```markdown
# AI Workflow Audit: [Task Name]

## Executive Summary

## What Happened

## Primary Findings

## Repository Evidence

## External Evidence

## Improved Prompt

## Recommended Context Bundle

## Recommended Workflow

## Verification Plan

## Estimated Efficiency Improvement

## Reusable Playbook

## Methodology and Limitations
```

### Publishing behaviour

* Prepare issue draft
* Wait for user approval when approval mode is enabled
* Publish through GitHub API
* Store issue number and URL
* Mark engagement complete

---

# 7. Required Agent Collaboration

The implementation must visibly demonstrate collaboration.

Example flow:

```text
Agency Manager
├── Session Auditor
├── Context Investigator
│   ├── GitHub repository inspection
│   └── Linkup research
├── Efficiency Analyst
└── Workflow Coach
        ↓
Quality Reviewer
        ↓
Revision requested
        ↓
Workflow Coach v2
        ↓
Quality Reviewer approves
        ↓
User approval
        ↓
Deliverable Publisher
```

The manager should be able to skip agents.

Examples:

* Skip Efficiency Analyst if no token metadata exists
* Skip external research if repository evidence is sufficient
* Skip Workflow Coach for a high-quality conversation where only a health report is required

---

# 8. Technology Stack

## Required stack

### Agent runtime

* Hermes
* OpenAI model configured through Hermes

### Frontend

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* shadcn/ui

### Backend and persistence

* Convex

### Real output surface

* GitHub Issues API

### External research

* Linkup

### Deployment

* Cloudflare

### Build-time integration

* Wispr Flow

### Optional stretch integration

* ElevenLabs spoken executive briefing

---

# 9. Hermes Instructions

Create a `.hermes.md` file at the project root.

It should instruct Hermes to:

* Treat this document as the product specification
* Build a working vertical slice before styling
* Use strict TypeScript
* Prefer small modules
* Avoid unnecessary abstraction
* Use structured outputs for all agents
* Validate all model output with schemas
* Persist all agent steps
* Record latency and estimated cost
* Keep all secrets in environment variables
* Never mock the GitHub publication in the final flow
* Never fabricate repository evidence
* Never claim exact token savings without real metadata
* Keep the application usable without authentication
* Implement only the defined MVP scope

Suggested `.hermes.md`:

```markdown
# Mizan Build Instructions

You are implementing the Mizan hackathon MVP.

Read `README.md` and `docs/IMPLEMENTATION_PLAN.md` before making changes.

## Priorities

1. Complete one real end-to-end engagement.
2. Publish a real GitHub issue.
3. Persist complete agent traces.
4. Implement dynamic agent planning.
5. Implement one reviewer revision loop.
6. Add evaluation cases.
7. Add management controls.
8. Polish the interface only after the core flow works.

## Engineering constraints

- Use Next.js App Router and TypeScript.
- Use Convex as the backend.
- Use Zod for runtime validation.
- Use structured JSON outputs for all model calls.
- Do not add authentication.
- Do not add a database besides Convex.
- Do not implement private GitHub repository OAuth.
- Do not build a generic chatbot.
- Do not hide errors.
- Record every agent step with timing and cost metadata.
- Keep the codebase simple enough for an eight-hour hackathon.

## Quality requirements

- Repository claims must cite real files.
- External claims must include real sources.
- Estimates must be labelled as estimates.
- The final output must be publishable as a GitHub issue.
- A reviewer must approve the final report.
```

---

# 10. Application Routes

## `/`

Landing page and new engagement form.

### Fields

* Engagement title
* Task objective
* Conversation
* GitHub repository URL
* Expected outcome
* Token metadata
* Strictness level
* Maximum budget
* Approval required
* Output type

### Actions

* Load sample engagement
* Start audit

---

## `/runs`

List all engagements.

### Display

* Title
* Repository
* Status
* Created date
* Agents used
* Cost
* Latency
* Reviewer result
* Published issue

---

## `/runs/[id]`

Primary engagement page.

### Sections

* Engagement summary
* Agency plan
* Agent trace
* Findings
* Improved prompt
* Context recommendations
* Efficiency estimates
* Reviewer status
* Publication approval
* GitHub issue link

---

## `/evaluations`

Evaluation suite.

### Display

* Evaluation cases
* Current prompt version
* Pass rate
* Failure reasons
* Previous version comparison

### Action

* Run evaluation suite

---

## `/settings`

Management settings.

### Controls

* Default budget
* Strictness
* Evidence requirements
* Publication approval
* Enabled agents
* Maximum revision cycles
* External research allowed
* Default GitHub repository

---

## `/proof`

Hackathon proof page.

### Display

* Completed engagements
* Success rate
* Published GitHub issues
* Median latency
* Median cost
* Agent plans generated
* Agents skipped
* Reviewer revisions
* Evaluation pass rate
* Integration status

---

# 11. Convex Data Model

## `engagements`

```ts
{
  title: string;
  taskObjective: string;
  conversation: string;
  repositoryUrl: string;
  expectedOutcome?: string;
  status:
    | "draft"
    | "planning"
    | "running"
    | "review"
    | "awaiting_approval"
    | "publishing"
    | "completed"
    | "failed";
  strictness: "low" | "medium" | "high";
  maxBudgetUsd: number;
  approvalRequired: boolean;
  outputType: "github_issue";
  totalInputTokens?: number;
  totalOutputTokens?: number;
  estimatedCostUsd?: number;
  totalLatencyMs?: number;
  githubIssueUrl?: string;
  createdAt: number;
  completedAt?: number;
}
```

## `plans`

```ts
{
  engagementId: Id<"engagements">;
  engagementSummary: string;
  selectedAgents: AgentSelection[];
  skippedAgents: AgentSelection[];
  acceptanceCriteria: string[];
  requiresExternalResearch: boolean;
  requiresRepositoryEvidence: boolean;
  createdAt: number;
}
```

## `agentSteps`

```ts
{
  engagementId: Id<"engagements">;
  parentStepId?: Id<"agentSteps">;
  agentName: string;
  version: number;
  status: "pending" | "running" | "completed" | "failed";
  input: unknown;
  output?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}
```

## `handoffs`

```ts
{
  engagementId: Id<"engagements">;
  fromAgent: string;
  toAgent: string;
  objective: string;
  relevantFacts: string[];
  repositoryEvidence: Evidence[];
  externalEvidence: Evidence[];
  openQuestions: string[];
  createdAt: number;
}
```

## `artifacts`

```ts
{
  engagementId: Id<"engagements">;
  type:
    | "executive_report"
    | "improved_prompt"
    | "playbook"
    | "github_issue";
  content: string;
  status: "draft" | "approved" | "published";
  externalUrl?: string;
  createdAt: number;
}
```

## `repositoryEvidence`

```ts
{
  engagementId: Id<"engagements">;
  path: string;
  url: string;
  excerpt?: string;
  reason: string;
  sourceAgent: string;
}
```

## `externalEvidence`

```ts
{
  engagementId: Id<"engagements">;
  title: string;
  url: string;
  summary: string;
  sourceAgent: string;
}
```

## `evalCases`

```ts
{
  name: string;
  description: string;
  conversation: string;
  repositoryUrl: string;
  expectedFindings: string[];
  prohibitedFindings: string[];
  expectedArtifacts: string[];
}
```

## `evalRuns`

```ts
{
  version: string;
  caseId: Id<"evalCases">;
  passed: boolean;
  score: number;
  detectedFindings: string[];
  missedFindings: string[];
  incorrectFindings: string[];
  createdAt: number;
}
```

---

# 12. API and Server Actions

## Start engagement

```text
POST /api/engagements
```

Creates the engagement and initiates planning.

## Generate manager plan

```text
POST /api/engagements/:id/plan
```

## Run engagement

```text
POST /api/engagements/:id/run
```

Runs selected specialists.

## Review engagement

```text
POST /api/engagements/:id/review
```

## Approve publication

```text
POST /api/engagements/:id/approve
```

## Publish GitHub issue

```text
POST /api/engagements/:id/publish
```

## Run evaluations

```text
POST /api/evaluations/run
```

Where possible, use Convex actions rather than duplicating backend state in Next.js route handlers.

---

# 13. Structured Output Validation

Use Zod schemas for every agent response.

Required schemas:

* `AgencyPlanSchema`
* `SessionAuditSchema`
* `ContextAnalysisSchema`
* `EfficiencyAnalysisSchema`
* `WorkflowRecommendationSchema`
* `QualityReviewSchema`
* `ExecutiveReportSchema`

On invalid output:

1. Store the raw response
2. Mark the step as failed validation
3. Retry once with validation errors
4. If the retry fails, show the error in the trace
5. Do not continue to publication

---

# 14. Trace and Observability Requirements

Every agent execution must record:

* Agent name
* Parent agent or step
* Input
* Output
* Model
* Start time
* End time
* Latency
* Input tokens
* Output tokens
* Estimated cost
* Status
* Error
* Revision version

The trace UI should display a tree.

Example:

```text
Agency Manager
├── Session Auditor
├── Context Investigator
│   ├── GitHub Fetch
│   └── Linkup Search
├── Efficiency Analyst
├── Workflow Coach
├── Quality Reviewer
│   └── Revision Requested
├── Workflow Coach v2
├── Quality Reviewer v2
└── GitHub Publisher
```

The user should be able to:

* Expand a step
* View input
* View output
* See token usage
* See cost
* See latency
* Filter by agent
* Filter by status

---

# 15. Management Controls

Required controls:

## Strictness

### Low

* General recommendations allowed
* Repository evidence preferred

### Medium

* Repository claims require evidence
* Estimates require confidence labels

### High

* Every material claim needs evidence
* Unsupported recommendations trigger review failure

## Budget

The manager should be aware of a maximum engagement budget.

For the MVP:

* Warn when estimated cost exceeds the budget
* Do not require complex dynamic model routing

## Enabled agents

Allow the user to enable or disable:

* Efficiency Analyst
* External research
* Reusable playbook generation
* Spoken executive summary

## Approval policy

* Manual approval required
* Automatic publication after reviewer approval

Default to manual approval.

---

# 16. Evaluation Suite

Create at least five fixed evaluation cases.

## EVAL-01: Missing constraints

Expected findings:

* Missing acceptance criteria
* Missing retry scope
* Corrective requirement changes

## EVAL-02: Excessive context

Expected findings:

* Irrelevant files
* Oversized context
* Recommended smaller context bundle

## EVAL-03: Requirement churn

Expected findings:

* Multiple changes after implementation began
* Planning should precede implementation

## EVAL-04: Missing repository evidence

Expected findings:

* Unsupported architectural assumption
* Relevant repository file should have been included

## EVAL-05: High-quality interaction

Expected findings:

* Strong objective
* Clear constraints
* Appropriate context
* Verification present

The system must not manufacture serious problems for EVAL-05.

## Evaluation scoring

For each case:

```text
Score =
  expected findings detected
  - incorrect findings
  - missing required artifacts
```

Show:

* Current version score
* Previous version score
* Case-level pass/fail
* Failure reasons

Stretch goal:

Prevent activation of a new agent prompt version if the evaluation pass rate is below 80%.

---

# 17. GitHub Integration

## Inputs

* Public repository owner
* Public repository name
* GitHub personal access token from environment variables

## Required operations

* Fetch repository tree
* Fetch selected file contents
* Search for likely relevant files
* Create GitHub issue

## Repository investigation strategy

Do not ingest the entire repository.

Use:

1. Repository tree
2. File-name heuristics
3. Task keywords
4. Likely source directories
5. Likely tests
6. Architecture documents
7. README
8. ADR directories

Limit fetched file content.

Use a maximum number of files per run.

Suggested limits:

* Maximum tree entries processed: 2,000
* Maximum files fetched: 10
* Maximum characters per file: 12,000
* Maximum repository context characters: 60,000

---

# 18. Linkup Integration

Use Linkup only when external evidence is relevant.

Possible searches:

* Official framework documentation
* Model API behaviour
* Security recommendations
* Current AI pricing
* Prompting or context-engineering guidance
* Retry and reliability best practices

Requirements:

* Use no more than two searches per engagement
* Store search query and result
* Use the result in the final report
* Display sources
* Do not run decorative searches

---

# 19. Cost Estimation

Maintain a simple model price configuration.

Example:

```ts
type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};
```

Calculate:

```text
Input cost =
input tokens × input price / 1,000,000

Output cost =
output tokens × output price / 1,000,000
```

Store pricing configuration separately.

For avoidable cost:

* Return ranges
* Include confidence
* Explain the basis
* Never treat the estimate as a measured saving

---

# 20. UI Design

## Visual direction

Mizan should feel like a premium consulting and observability product.

Reference qualities:

* Linear
* Vercel
* Stripe
* Datadog traces

## Avoid

* Cartoon agents
* Excessive animations
* Neon AI gradients
* Large amounts of explanatory copy
* Dense charts
* Gamified developer scoring

## Key visual elements

* Clean engagement form
* Strong report hierarchy
* Agent trace tree
* Reviewer status
* Evidence links
* Improved prompt comparison
* Publication button
* GitHub issue confirmation

---

# 21. Suggested Component Structure

```text
components/
  engagement/
    engagement-form.tsx
    objective-field.tsx
    conversation-editor.tsx
    repository-field.tsx

  agency/
    agency-plan.tsx
    agent-badge.tsx
    agent-status.tsx
    reviewer-decision.tsx

  trace/
    trace-tree.tsx
    trace-node.tsx
    trace-detail-panel.tsx
    token-usage.tsx
    cost-display.tsx
    latency-display.tsx

  report/
    executive-summary.tsx
    findings-list.tsx
    improved-prompt.tsx
    context-bundle.tsx
    efficiency-estimate.tsx
    evidence-list.tsx
    playbook.tsx

  publication/
    publication-preview.tsx
    approve-publication.tsx
    github-issue-link.tsx

  evaluations/
    evaluation-table.tsx
    evaluation-result.tsx
    version-comparison.tsx
```

---

# 22. Suggested Code Structure

```text
app/
  page.tsx
  runs/
    page.tsx
    [id]/
      page.tsx
  evaluations/
    page.tsx
  settings/
    page.tsx
  proof/
    page.tsx

convex/
  schema.ts
  engagements.ts
  plans.ts
  agentSteps.ts
  artifacts.ts
  evaluations.ts
  actions/
    runAgency.ts
    inspectRepository.ts
    publishGitHubIssue.ts
    runEvaluationSuite.ts

lib/
  agents/
    manager.ts
    session-auditor.ts
    context-investigator.ts
    efficiency-analyst.ts
    workflow-coach.ts
    quality-reviewer.ts
    publisher.ts
    prompts.ts
    schemas.ts

  github/
    client.ts
    repository.ts
    issues.ts

  linkup/
    client.ts

  ai/
    client.ts
    pricing.ts
    structured-output.ts

  observability/
    tracing.ts
    cost.ts
    timing.ts

  reports/
    compose-report.ts
    github-markdown.ts
```

---

# 23. Error Handling

Required error states:

* Invalid repository URL
* Repository unavailable
* GitHub rate limit
* GitHub token missing
* Linkup failure
* LLM timeout
* Invalid structured output
* Reviewer rejection
* Publication failure
* Budget exceeded
* Evaluation failure

Errors must:

* Be visible in the trace
* Include a useful message
* Preserve completed agent outputs
* Allow rerunning the failed step where practical

---

# 24. Security and Privacy

For the MVP:

* Use public repositories only
* Display a warning before conversation submission
* Do not log secrets
* Redact obvious API keys before sending content to the model
* Store tokens only in environment variables
* Do not expose GitHub tokens to the browser
* Do not include internal chain-of-thought in traces
* Show concise agent rationale summaries, not hidden reasoning

---

# 25. Demo Data

Prepare three sample engagements.

## Sample A: Retry implementation

Problems:

* Initial request is too vague
* Requirements appear across later turns
* Existing retry abstraction is omitted
* Verification is incomplete

Expected result:

* Strong rewrite
* Repository evidence
* One reviewer revision

## Sample B: Excessive context

Problems:

* Too many files supplied
* Only a few are relevant
* Context bundle recommendation is the main result

Expected result:

* Manager skips Efficiency Analyst if token metadata is absent
* Context Investigator dominates the engagement

## Sample C: Strong interaction

Characteristics:

* Clear objective
* Constraints included
* Relevant files included
* Tests requested
* Output verified

Expected result:

* Mizan recognises good practice
* Does not exaggerate waste
* Produces a short healthy-interaction report

---

# 26. Definition of Done

The MVP is complete only when:

* A user can create an engagement
* The Agency Manager dynamically selects agents
* At least three specialist agents can run
* Repository evidence is retrieved
* Linkup evidence is used
* A Quality Reviewer approves or requests revision
* One revision loop works
* Final output can be manually approved
* A real GitHub issue is created
* The GitHub issue URL is stored
* Every step appears in a trace tree
* Tokens, cost, and latency are shown
* Engagements persist in Convex
* Five evaluation cases can be run
* The application is deployed on Cloudflare
* The proof page shows real evidence

---

# 27. Prioritised Build Sequence

## Milestone 1: End-to-end vertical slice

Build:

```text
Create engagement
→ Manager plan
→ Session Auditor
→ Workflow Coach
→ Quality Reviewer
→ Manual approval
→ GitHub issue
```

Do not start visual polish before this works.

## Milestone 2: Persistence and traces

Add:

* Convex
* Engagement state
* Agent steps
* Tokens
* Cost
* Latency
* Trace UI

## Milestone 3: Repository investigation

Add:

* GitHub repository tree
* Relevant file selection
* File evidence
* Context Investigator

## Milestone 4: External research

Add:

* Linkup
* Stored sources
* Evidence in report

## Milestone 5: Dynamic organisation

Add:

* Agent selection
* Agent skipping
* Acceptance criteria
* One revision loop

## Milestone 6: Evaluation suite

Add:

* Five cases
* Run suite
* Version comparison

## Milestone 7: Management UI

Add:

* Strictness
* Budget
* Approval policy
* Agent controls

## Milestone 8: Proof and deployment

Add:

* Cloudflare deployment
* Proof page
* Three completed engagements
* Integration evidence

---

# 28. Time-boxed Eight-Hour Plan

## Hour 1

* Scaffold Next.js
* Configure Convex
* Create engagement form
* Store engagement
* Implement one model call

## Hour 2

* Implement manager
* Implement Session Auditor
* Implement Workflow Coach
* Validate structured outputs

## Hour 3

* Implement Quality Reviewer
* Add one revision loop
* Generate final report

## Hour 4

* Integrate GitHub
* Publish a real issue
* Complete first vertical slice

## Hour 5

* Add Context Investigator
* Fetch repository evidence
* Integrate Linkup

## Hour 6

* Add trace persistence
* Build trace tree
* Show tokens, cost, and latency

## Hour 7

* Add evaluation suite
* Add management controls
* Add proof page

## Hour 8

* Deploy to Cloudflare
* Run three demo engagements
* Fix reliability issues
* Capture proof
* Rehearse demo

---

# 29. Non-negotiable Product Principles

1. Mizan is an agency, not a chatbot.
2. The final output must leave the product.
3. GitHub publication must be real.
4. The manager must make task-specific decisions.
5. Agents must have distinct responsibilities.
6. Every claim should be traceable.
7. Estimates must be honest.
8. Good AI usage must be recognised, not penalised.
9. The system should coach developers, not surveil them.
10. Build the complete workflow before polishing the interface.

---

# 30. Final Product Narrative

> Companies have adopted AI faster than they have learned to manage it. Developers now spend engineering time and AI compute together, but organisations have little visibility into whether those inputs are being used effectively.
>
> Mizan operates like an AI enablement consulting agency. It studies a developer’s AI coding session, investigates the surrounding repository, identifies missing or wasteful context, redesigns the workflow, reviews its own recommendations, and publishes a client-ready playbook directly into GitHub.
>
> Mizan does not reward using less AI. It helps engineering teams create better outcomes with the minimum necessary AI effort.

