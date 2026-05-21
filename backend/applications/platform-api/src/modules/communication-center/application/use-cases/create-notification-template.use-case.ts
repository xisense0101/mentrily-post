import { randomUUID } from 'node:crypto';
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
import { NotificationTemplate } from '../../domain/entities/index.js';
import { communicationTemplateActivated, communicationTemplateCreated } from '../../domain/events/index.js';
import { NotificationTemplateRepository } from '../../domain/repositories/index.js';
import { NotificationTemplatePolicyService } from '../../domain/services/index.js';
import { mapNotificationTemplateToResponse } from '../mappers/index.js';
import type { CreateNotificationTemplateInput, NotificationTemplateResponse } from '../dto/index.js';
import { CommunicationEventPublisherService } from '../services/index.js';
import { requireCommunicationActor } from '../support/index.js';

@Injectable()
export class CreateNotificationTemplateUseCase {
  constructor(
    @Inject(NotificationTemplateRepository) private readonly templateRepository: NotificationTemplateRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(NotificationTemplatePolicyService) private readonly templatePolicy: NotificationTemplatePolicyService,
    @Inject(CommunicationEventPublisherService) private readonly eventPublisher: CommunicationEventPublisherService,
  ) {}

  async execute(context: RequestContext, input: CreateNotificationTemplateInput): Promise<NotificationTemplateResponse> {
    const workspace = requireCommunicationActor(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_TEMPLATE_CREATE, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    this.templatePolicy.validateCreate({
      channel: input.channel,
      subjectTemplate: input.subjectTemplate,
      bodyTemplate: input.bodyTemplate,
      variables: input.variables ?? [],
    });

    const existing = await this.templateRepository.findByWorkspaceKey({
      workspaceId: workspace.workspaceId,
      key: input.key.trim(),
    });
    if (existing) {
      throw new AppError('CONFLICT', 'notification template key already exists', 409);
    }

    return this.transactionRunner.run(async (tx) => {
      const created = NotificationTemplate.createDraft({
        id: randomUUID(),
        tenantId: workspace.tenantId,
        workspaceId: workspace.workspaceId,
        key: input.key,
        name: input.name,
        description: input.description,
        channel: input.channel,
        subjectTemplate: input.subjectTemplate,
        bodyTemplate: input.bodyTemplate,
        variables: input.variables ?? [],
        metadata: input.metadata ?? {},
        createdByPrincipalId: workspace.actorId,
      });
      const saved = await this.templateRepository.save(input.activate ? created.activate() : created, tx);

      await this.auditRecorder.record(
        {
          action: 'communication.template.created',
          actorId: workspace.actorId,
          targetType: 'communication.template',
          targetId: saved.id,
          metadata: { key: saved.key, channel: saved.channel },
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        communicationTemplateCreated({
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          templateId: saved.id,
          channel: saved.channel,
          status: saved.status,
          key: saved.key,
        }),
        context,
        tx,
      );
      if (saved.status === 'ACTIVE') {
        await this.eventPublisher.publishDomainEvent(
          communicationTemplateActivated({
            tenantId: saved.tenantId,
            workspaceId: saved.workspaceId,
            templateId: saved.id,
            channel: saved.channel,
            status: saved.status,
          }),
          context,
          tx,
        );
      }

      return mapNotificationTemplateToResponse(saved);
    });
  }
}
