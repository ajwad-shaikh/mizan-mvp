import type { z } from "zod";
import type {
  AgencyPlanSchema,
  AgentNameSchema,
  AgentSelectionSchema,
  SessionAuditSchema,
  WorkflowRecommendationSchema,
  QualityReviewSchema,
  ExecutiveReportSchema,
} from "./schemas";

export type { Strictness } from "@/lib/engagements/schema";

export type AgentName = z.infer<typeof AgentNameSchema>;
export type AgentSelection = z.infer<typeof AgentSelectionSchema>;
export type AgencyPlan = z.infer<typeof AgencyPlanSchema>;
export type SessionAudit = z.infer<typeof SessionAuditSchema>;
export type WorkflowRecommendation = z.infer<typeof WorkflowRecommendationSchema>;
export type QualityReview = z.infer<typeof QualityReviewSchema>;
export type ExecutiveReport = z.infer<typeof ExecutiveReportSchema>;
