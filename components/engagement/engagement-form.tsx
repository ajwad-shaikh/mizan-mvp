"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createEngagementAction, type EngagementFormState } from "@/app/actions";
import { RETRY_SAMPLE } from "@/lib/samples";

const initialState: EngagementFormState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-400">{message}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Running audit…" : "Start audit"}
    </button>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

export function EngagementForm() {
  const [state, formAction] = useActionState(createEngagementAction, initialState);
  const [values, setValues] = useState({
    title: "",
    taskObjective: "",
    conversation: "",
    repositoryUrl: "",
    expectedOutcome: "",
    strictness: "medium",
    maxBudgetUsd: "5",
    approvalRequired: true,
  });

  const set = (key: keyof typeof values, value: string | boolean) =>
    setValues((v) => ({ ...v, [key]: value }));

  const loadSample = () =>
    setValues({
      title: RETRY_SAMPLE.title,
      taskObjective: RETRY_SAMPLE.taskObjective,
      conversation: RETRY_SAMPLE.conversation,
      repositoryUrl: RETRY_SAMPLE.repositoryUrl,
      expectedOutcome: RETRY_SAMPLE.expectedOutcome ?? "",
      strictness: RETRY_SAMPLE.strictness,
      maxBudgetUsd: String(RETRY_SAMPLE.maxBudgetUsd),
      approvalRequired: RETRY_SAMPLE.approvalRequired,
    });

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
        Privacy: paste conversations from public or non-sensitive work only. Content is sent to the
        configured model provider. Use public repositories.
      </div>

      <div>
        <label className="text-sm font-medium">Engagement title</label>
        <input
          name="title"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputClass}
          placeholder="Retry implementation audit"
        />
        <FieldError message={state.errors?.title} />
      </div>

      <div>
        <label className="text-sm font-medium">Task objective</label>
        <textarea
          name="taskObjective"
          value={values.taskObjective}
          onChange={(e) => set("taskObjective", e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="What was the developer trying to accomplish?"
        />
        <FieldError message={state.errors?.taskObjective} />
      </div>

      <div>
        <label className="text-sm font-medium">AI conversation</label>
        <textarea
          name="conversation"
          value={values.conversation}
          onChange={(e) => set("conversation", e.target.value)}
          rows={8}
          className={`${inputClass} font-mono text-xs`}
          placeholder="Paste the developer–AI coding conversation."
        />
        <FieldError message={state.errors?.conversation} />
      </div>

      <div>
        <label className="text-sm font-medium">Public GitHub repository URL</label>
        <input
          name="repositoryUrl"
          value={values.repositoryUrl}
          onChange={(e) => set("repositoryUrl", e.target.value)}
          className={inputClass}
          placeholder="https://github.com/owner/repo"
        />
        <FieldError message={state.errors?.repositoryUrl} />
      </div>

      <div>
        <label className="text-sm font-medium">Expected outcome (optional)</label>
        <input
          name="expectedOutcome"
          value={values.expectedOutcome}
          onChange={(e) => set("expectedOutcome", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Strictness</label>
          <select
            name="strictness"
            value={values.strictness}
            onChange={(e) => set("strictness", e.target.value)}
            className={inputClass}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Maximum budget (USD)</label>
          <input
            name="maxBudgetUsd"
            type="number"
            step="0.01"
            min="0"
            value={values.maxBudgetUsd}
            onChange={(e) => set("maxBudgetUsd", e.target.value)}
            className={inputClass}
          />
          <FieldError message={state.errors?.maxBudgetUsd} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="approvalRequired"
          type="checkbox"
          checked={values.approvalRequired}
          onChange={(e) => set("approvalRequired", e.target.checked)}
        />
        Require manual approval before publishing to GitHub
      </label>

      {state.errors?.form && <FieldError message={state.errors.form} />}

      <div className="flex items-center gap-3">
        <SubmitButton />
        <button
          type="button"
          onClick={loadSample}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-white"
        >
          Load sample engagement
        </button>
      </div>
    </form>
  );
}
