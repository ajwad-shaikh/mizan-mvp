/**
 * Deterministic model responses for the offline demo and for any agent that is
 * exercised in fixture mode. These are tuned to the "retry implementation"
 * sample engagement. Every string here is valid JSON that satisfies the
 * corresponding agent schema, so it flows through the same validation as real
 * model output.
 *
 * The Quality Reviewer intentionally requests one revision on its first call and
 * approves on the second, so the demo shows a complete revision loop.
 */

const managerPlan = {
  engagementSummary:
    "The developer asked an AI to add retry behaviour to a service, but constraints (transient-only retries, backoff) arrived across later turns, causing avoidable rework.",
  selectedAgents: [
    {
      agent: "session_auditor",
      reason: "The conversation shows drift and corrective turns worth reconstructing.",
      instructions: [
        "Count user, assistant, and corrective turns.",
        "Identify when acceptance criteria first appeared.",
      ],
    },
    {
      agent: "workflow_coach",
      reason: "The main deliverable is a reusable, better-structured prompt and workflow.",
      instructions: [
        "Produce an improved prompt with explicit constraints and acceptance criteria.",
        "Provide a verification plan and a reusable playbook.",
      ],
    },
    {
      agent: "quality_reviewer",
      reason: "The generated coaching deliverable requires an independent quality gate.",
      instructions: [],
    },
  ],
  skippedAgents: [
    {
      agent: "context_investigator",
      reason: "Repository evidence gathering is out of scope for this vertical slice.",
    },
    {
      agent: "efficiency_analyst",
      reason: "No token metadata was supplied, so exact efficiency figures cannot be computed.",
    },
  ],
  acceptanceCriteria: [
    "The improved prompt must be directly reusable without editing.",
    "Any efficiency figure must be labelled as an estimate.",
    "Findings must reference only the supplied conversation.",
  ],
  requiresExternalResearch: false,
  requiresRepositoryEvidence: false,
};

const sessionAudit = {
  initialObjective: "Add retry logic to the API client.",
  finalObjective: "Add retries only for transient (5xx/network) errors with capped exponential backoff.",
  summary:
    "The initial request lacked scope and acceptance criteria. Constraints about which errors to retry and backoff behaviour arrived in later turns, producing three corrective iterations before the code matched intent.",
  userTurns: 6,
  assistantTurns: 6,
  correctiveTurns: 3,
  requirementChanges: [
    { turn: 3, change: "Retry only transient errors, not 4xx.", impact: "Reworked the error classification." },
    { turn: 4, change: "Add capped exponential backoff.", impact: "Reworked the retry loop timing." },
  ],
  strengths: ["The developer eventually asked for unit tests covering both error classes."],
  problems: [
    {
      type: "missing_constraint",
      severity: "high",
      evidence: "Turn 1 requested 'add retries' with no error scope or backoff policy.",
    },
    {
      type: "late_acceptance_criteria",
      severity: "medium",
      evidence: "Acceptance criteria only became clear by turn 4.",
    },
  ],
  verificationObserved: true,
};

const workflowDraft = {
  improvedPrompt: [
    "Objective",
    "Add retry behaviour to the API client.",
    "",
    "Constraints",
    "- Retry only transient failures (network errors and 5xx).",
    "- Do not retry 4xx responses.",
    "",
    "Acceptance criteria",
    "- Unit tests cover transient and permanent errors.",
    "",
    "Verification steps",
    "- Run the existing unit test suite.",
  ].join("\n"),
  recommendedContextBundle: ["The existing HTTP client module", "Any current retry or backoff helper"],
  recommendedWorkflow: [
    { step: 1, action: "Ask the model to inspect the current client before proposing changes.", reason: "Prevents incorrect assumptions about existing retry code." },
    { step: 2, action: "State the transient-only constraint up front.", reason: "Avoids corrective turns about error scope." },
  ],
  verificationPlan: ["Run existing unit tests.", "Add tests for transient and permanent errors."],
  reusablePlaybook: {
    name: "Retry Behaviour Change",
    content: "State which errors are retryable, the backoff policy, and the test cases before requesting implementation.",
  },
  coachingNotes: ["State business invariants and acceptance criteria before requesting implementation."],
};

const workflowRevised = {
  ...workflowDraft,
  improvedPrompt: [
    "Objective",
    "Add retry behaviour to the API client.",
    "",
    "Background",
    "The client currently issues single-shot HTTP requests with no retry.",
    "",
    "Constraints",
    "- Retry only transient failures (network errors and 5xx).",
    "- Do not retry 4xx responses.",
    "- Use capped exponential backoff (max 3 attempts).",
    "",
    "Non-goals",
    "- Do not change unrelated request logic.",
    "",
    "Acceptance criteria",
    "- Unit tests cover transient errors (retried) and permanent errors (not retried).",
    "- Backoff is capped and bounded.",
    "",
    "Verification steps",
    "- Run the existing unit test suite.",
    "- Add tests asserting no retry on 4xx.",
  ].join("\n"),
  coachingNotes: [
    "State business invariants and acceptance criteria before requesting implementation.",
    "Explicitly name non-goals to prevent scope creep.",
  ],
};

const reviewRevisionRequested = {
  status: "revision_requested",
  score: 62,
  issues: [
    {
      type: "incomplete_prompt",
      description: "The improved prompt omits the capped-backoff constraint and non-goals that caused rework.",
      requiredAction: "Add the backoff cap and an explicit non-goals section to the improved prompt.",
    },
  ],
  revisionTarget: "workflow_coach",
  revisionInstructions: [
    "Add the capped exponential backoff constraint to the improved prompt.",
    "Add a non-goals section to prevent scope creep.",
  ],
};

const reviewApproved = {
  status: "approved",
  score: 91,
  issues: [],
  revisionInstructions: [],
};

function stableFallback(agentName: string): string {
  // Any agent without a tuned fixture still returns valid-ish JSON so callers
  // surface a clear schema error rather than a crash.
  return JSON.stringify({ error: `No fixture configured for agent '${agentName}'.` });
}

export function fixtureResponse(agentName: string, callIndex: number, prompt: string): string {
  switch (agentName) {
    case "agency_manager": {
      const title = prompt.match(/^Engagement title:\s*(.+)$/m)?.[1]?.trim();
      const objective = prompt.match(/Task objective:\n([^\n]+)/)?.[1]?.trim();
      const engagementSummary =
        title && objective
          ? `${title}: ${objective} Fixture mode demonstrates the audit workflow; findings remain demo-only.`
          : managerPlan.engagementSummary;
      return JSON.stringify({ ...managerPlan, engagementSummary });
    }
    case "session_auditor":
      return JSON.stringify(sessionAudit);
    case "workflow_coach":
      return JSON.stringify(callIndex === 0 ? workflowDraft : workflowRevised);
    case "quality_reviewer":
      return JSON.stringify(callIndex === 0 ? reviewRevisionRequested : reviewApproved);
    default:
      return stableFallback(agentName);
  }
}
