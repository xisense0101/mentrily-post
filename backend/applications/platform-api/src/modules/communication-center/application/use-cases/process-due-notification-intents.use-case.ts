import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationIntentRepository } from '../../domain/repositories/index.js';
import { NotificationSchedulerService, type NotificationSchedulerProcessResult } from '../services/index.js';

export interface ProcessDueNotificationIntentsInput {
  context: RequestContext;
  workspaceId?: string | undefined;
  limit?: number | undefined;
  now?: Date | undefined;
}

export interface ProcessDueNotificationIntentsResponse {
  processed: number;
  dispatched: number;
  failed: number;
  skipped: number;
  results: NotificationSchedulerProcessResult[];
}

@Injectable()
export class ProcessDueNotificationIntentsUseCase {
  constructor(
    @Inject(NotificationIntentRepository) private readonly intentRepository: NotificationIntentRepository,
    @Inject(NotificationSchedulerService)
    private readonly schedulerService: NotificationSchedulerService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(input: ProcessDueNotificationIntentsInput): Promise<ProcessDueNotificationIntentsResponse> {
    const { context, workspaceId } = input;
    const workspace = context.workspace;

    if (!workspace || !workspace.actorId) {
      throw new AppError('UNAUTHORIZED', 'missing internal scheduler actor', 401);
    }

    if (!this.isInternalSchedulerActor(workspace.actorId)) {
      throw new AppError('FORBIDDEN', 'scheduler requires an internal or system actor', 403);
    }

    if (workspaceId && workspace.workspaceId !== workspaceId) {
      throw new AppError('FORBIDDEN', 'workspace scheduler scope mismatch', 403);
    }

    const permission = await this.permissionEvaluator.evaluate(
      {
        permission: PermissionCatalog.COMMUNICATION_SCHEDULER_PROCESS,
        workspace,
      },
      context,
    );

    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const now = input.now ?? new Date();
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    const intents = await this.intentRepository.findDueQueued({
      workspaceId,
      limit,
      now,
    });

    const results: NotificationSchedulerProcessResult[] = [];

    for (const intent of intents) {
      results.push(await this.schedulerService.processIntent(intent, context, now));
    }

    return {
      processed: results.length,
      dispatched: results.filter((result) => result.status === 'DISPATCHED').length,
      failed: results.filter((result) => result.status === 'FAILED').length,
      skipped: results.filter((result) => result.status === 'SKIPPED').length,
      results,
    };
  }

  private isInternalSchedulerActor(actorId: string): boolean {
    return actorId.startsWith('system:') || actorId.startsWith('internal:');
  }
}
