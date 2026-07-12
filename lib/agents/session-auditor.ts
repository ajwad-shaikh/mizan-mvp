import type { ModelAdapter } from "@/lib/ai/client";
import { runStructured, type StructuredResult } from "@/lib/ai/structured-output";
import { SessionAuditSchema } from "./schemas";
import type { SessionAudit } from "./types";
import { SESSION_AUDITOR_SYSTEM, buildSessionAuditorPrompt, type SessionAuditorInput } from "./prompts";

export const SESSION_AUDITOR_AGENT_NAME = "session_auditor";

export function runSessionAuditor(
  adapter: ModelAdapter,
  input: SessionAuditorInput,
): Promise<StructuredResult<SessionAudit>> {
  return runStructured({
    adapter,
    agentName: SESSION_AUDITOR_AGENT_NAME,
    system: SESSION_AUDITOR_SYSTEM,
    prompt: buildSessionAuditorPrompt(input),
    schema: SessionAuditSchema,
  });
}
