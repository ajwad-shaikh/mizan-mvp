"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { EngagementIntakeSchema } from "@/lib/engagements/schema";
import { startEngagement, approveAndPublishEngagement, type PublishOutcome } from "@/lib/engagements/service";
import { createRateLimiter, parseRateLimitConfig } from "@/lib/security/rate-limit";

const intakeRateLimiter = createRateLimiter(parseRateLimitConfig(process.env));

export type EngagementFormState = {
  errors?: Record<string, string>;
  message?: string;
};

export async function createEngagementAction(
  _prev: EngagementFormState,
  formData: FormData,
): Promise<EngagementFormState> {
  const requestHeaders = await headers();
  const clientIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? requestHeaders.get("x-real-ip")
    ?? "unknown";
  if (!intakeRateLimiter.consume(clientIp)) {
    return { message: "Too many audit requests. Please wait a minute and try again." };
  }

  const raw = {
    title: String(formData.get("title") ?? ""),
    taskObjective: String(formData.get("taskObjective") ?? ""),
    conversation: String(formData.get("conversation") ?? ""),
    repositoryUrl: String(formData.get("repositoryUrl") ?? ""),
    expectedOutcome: String(formData.get("expectedOutcome") ?? "") || undefined,
    strictness: String(formData.get("strictness") ?? "medium"),
    maxBudgetUsd: Number(formData.get("maxBudgetUsd")),
    approvalRequired: formData.get("approvalRequired") === "on",
    outputType: "github_issue" as const,
  };

  const parsed = EngagementIntakeSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const id = await startEngagement(parsed.data, {
    async onPublicationCapability(engagementId, capability) {
      const cookieStore = await cookies();
      cookieStore.set(publicationCookieName(engagementId), capability, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: `/runs/${engagementId}`,
        maxAge: 60 * 60 * 24,
      });
    },
  });
  redirect(`/runs/${id}`);
}

export async function approvePublicationAction(
  engagementId: string,
): Promise<PublishOutcome> {
  const cookieStore = await cookies();
  const publicationCapability = cookieStore.get(publicationCookieName(engagementId))?.value ?? "";
  const result = await approveAndPublishEngagement(engagementId, publicationCapability);
  if (result.ok) cookieStore.delete(publicationCookieName(engagementId));
  revalidatePath(`/runs/${engagementId}`);
  return result;
}

function publicationCookieName(engagementId: string): string {
  return `mizan_publication_${engagementId}`;
}
