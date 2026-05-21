import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  AUDIT_RECORDER,
  type AuditRecorder,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { communicationTemplateArchived } from '../../domain/events/index.js';
import { NotificationTemplateRepository } from '../../domain/repositories/index.js';
import { mapNotificationTemplateToResponse } from '../mappers/index.js';
import type { NotificationTemplateResponse } from '../dto/index.js';
import { CommunicationEventPublisherService } from '../services/index.js';
import { ensureNotificationTemplateOwnership, requireCommunicationActor } from '../support/index.js';

@Injectable()
export class ArchiveNotificationTemplateUseCase {
  constructor(
    @Inject(NotificationTemplateRepository) private readonly templateRepository: NotificationTemplateRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(CommunicationEventPublisherService) private readonly eventPublisher: CommunicationEventPublisherService,
  ) {}

  async execute(context: RequestContext, templateId: string): Promise<NotificationTemplateResponse> {
    const workspace = requireCommunicationActor(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_TEMPLATE_ARCHIVE, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }
    const template = await this.templateRepository.findById(templateId);
    if (!template) {
      throw new AppError('NOT_FOUND', 'notification template not found', 404);
    }
    ensureNotificationTemplateOwnership(template, context);

    return this.transactionRunner.run(async (tx) => {
      const archived = await this.templateRepository.save(template.archive(), tx);
      await this.auditRecorder.record(
        {
          action: 'communication.template.archived',
          actorId: workspace.actorId,
          targetType: 'communication.template',
          targetId: archived.id,
          metadata: { key: archived.key, channel: archived.channel },
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        communicationTemplateArchived({
          tenantId: archived.tenantId,
          workspaceId: archived.workspaceId,
          templateId: archived.id,
          channel: archived.channel,
          status: archived.status,
        }),
        context,
        tx,
      );
      return mapNotificationTemplateToResponse(archived);
    });
  }
}
