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
import { NotificationIntent } from '../../domain/entities/index.js';
import { communicationIntentCreated, communicationIntentQueued } from '../../domain/events/index.js';
import { NotificationIntentRepository, NotificationTemplateRepository } from '../../domain/repositories/index.js';
import {
  NotificationIntentPolicyService,
  NotificationRecipientPolicyService,
  NotificationTemplatePolicyService,
} from '../../domain/services/index.js';
import { mapNotificationIntentToResponse } from '../mappers/index.js';
import type { CreateNotificationIntentInput, NotificationIntentResponse } from '../dto/index.js';
import { CommunicationEventPublisherService, NotificationTemplateRendererService } from '../services/index.js';
import { NOTIFICATION_PROVIDER_CONFIG, requireCommunicationActor, type NotificationProviderConfig } from '../support/index.js';

@Injectable()
export class CreateNotificationIntentUseCase {
  constructor(
    @Inject(NotificationIntentRepository) private readonly intentRepository: NotificationIntentRepository,
    @Inject(NotificationTemplateRepository) private readonly templateRepository: NotificationTemplateRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
    @Inject(AUDIT_RECORDER) private readonly auditRecorder: AuditRecorder,
    @Inject(NotificationTemplatePolicyService) private readonly templatePolicy: NotificationTemplatePolicyService,
    @Inject(NotificationIntentPolicyService) private readonly intentPolicy: NotificationIntentPolicyService,
    @Inject(NotificationRecipientPolicyService) private readonly recipientPolicy: NotificationRecipientPolicyService,
    @Inject(NotificationTemplateRendererService) private readonly renderer: NotificationTemplateRendererService,
    @Inject(CommunicationEventPublisherService) private readonly eventPublisher: CommunicationEventPublisherService,
    @Inject(NOTIFICATION_PROVIDER_CONFIG) private readonly providerConfig: NotificationProviderConfig,
  ) {}

  async execute(context: RequestContext, input: CreateNotificationIntentInput): Promise<NotificationIntentResponse> {
    const workspace = requireCommunicationActor(context);
    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_INTENT_CREATE, workspace },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    let subject = input.subject;
    let body = input.body;

    if (input.templateId) {
      const template = await this.templateRepository.findById(input.templateId);
      if (!template) {
        throw new AppError('NOT_FOUND', 'notification template not found', 404);
      }
      if (template.tenantId !== workspace.tenantId || template.workspaceId !== workspace.workspaceId) {
        throw new AppError('NOT_FOUND', 'notification template not found', 404);
      }
      if (!input.draft) {
        this.templatePolicy.assertCanRenderForIntent(template);
      } else {
        this.templatePolicy.assertCanPreviewRender(template);
      }
      const rendered = this.renderer.render({
        subjectTemplate: template.subjectTemplate,
        bodyTemplate: template.bodyTemplate,
        variables: input.variables ?? {},
        allowedVariables: template.variables,
      });
      subject = rendered.subject;
      body = rendered.body;
    }

    this.intentPolicy.validateCreate({
      channel: input.channel,
      subject,
      body: body ?? '',
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
    });
    this.recipientPolicy.validate(input.channel, input.recipient);

    return this.transactionRunner.run(async (tx) => {
      const intent = input.draft
        ? NotificationIntent.createDraft({
            id: randomUUID(),
            tenantId: workspace.tenantId,
            workspaceId: workspace.workspaceId,
            templateId: input.templateId,
            channel: input.channel,
            recipient: input.recipient,
            subject,
            body: body ?? '',
            priority: input.priority,
            provider: input.provider ?? this.providerConfig.defaultProvider,
            scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
            metadata: input.metadata ?? {},
            createdByPrincipalId: workspace.actorId,
          })
        : NotificationIntent.createQueued({
            id: randomUUID(),
            tenantId: workspace.tenantId,
            workspaceId: workspace.workspaceId,
            templateId: input.templateId,
            channel: input.channel,
            recipient: input.recipient,
            subject,
            body: body ?? '',
            priority: input.priority,
            provider: input.provider ?? this.providerConfig.defaultProvider,
            scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
            metadata: input.metadata ?? {},
            createdByPrincipalId: workspace.actorId,
          });
      const saved = await this.intentRepository.save(intent, tx);

      await this.auditRecorder.record(
        {
          action: 'communication.intent.created',
          actorId: workspace.actorId,
          targetType: 'communication.intent',
          targetId: saved.id,
          metadata: { channel: saved.channel, status: saved.status, templateId: saved.templateId },
        },
        context,
        tx,
      );
      await this.eventPublisher.publishDomainEvent(
        communicationIntentCreated({
          tenantId: saved.tenantId,
          workspaceId: saved.workspaceId,
          intentId: saved.id,
          templateId: saved.templateId,
          channel: saved.channel,
          status: saved.status,
          provider: saved.provider,
        }),
        context,
        tx,
      );
      if (saved.status === 'QUEUED') {
        await this.eventPublisher.publishDomainEvent(
          communicationIntentQueued({
            tenantId: saved.tenantId,
            workspaceId: saved.workspaceId,
            intentId: saved.id,
            channel: saved.channel,
            status: saved.status,
            provider: saved.provider,
          }),
          context,
          tx,
        );
      }
      return mapNotificationIntentToResponse(saved);
    });
  }
}
