/**
 * Start attempt - learner comes from context, no tenantId/workspaceId in body
 */
export interface StartAssessmentAttemptInput {
  assessmentId?: string;
  metadata?: Record<string, unknown>;
}
