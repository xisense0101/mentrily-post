import { AppError, RequestContext } from '@mentrily/service-core';

export interface AssessmentActorContext {
  tenantId: string;
  workspaceId: string;
  actorId: string;
}

export function requireAssessmentActor(context: RequestContext): AssessmentActorContext {
  const { tenantId, workspaceId, actorId } = context.workspace ?? {};

  if (!tenantId || !workspaceId || !actorId) {
    throw new AppError(
      'UNAUTHORIZED',
      'workspace and actor context are required for assessment operations',
      401,
    );
  }

  return { tenantId, workspaceId, actorId };
}
