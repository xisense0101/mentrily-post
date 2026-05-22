import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AppError,
  PERMISSION_EVALUATOR,
  type PermissionEvaluator,
  type RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { NotificationPreferenceRepository } from '../../domain/repositories/index.js';
import { NotificationPreference } from '../../domain/entities/index.js';
import { mapNotificationPreferenceToResponse } from '../mappers/index.js';
import type {
  NotificationPreferenceResponse,
  UpdateNotificationPreferencesInput,
} from '../dto/index.js';
import { requireCommunicationActor } from '../support/index.js';
import type {
  NotificationPreferenceCategoryContract,
  NotificationPreferenceChannelContract,
} from '@mentrily/contract-catalog';

const CHANNELS: NotificationPreferenceChannelContract[] = ['IN_APP', 'EMAIL', 'SMS'];
const CATEGORIES: NotificationPreferenceCategoryContract[] = [
  'SYSTEM',
  'COURSE',
  'ASSESSMENT',
  'MEDIA',
  'BILLING',
  'SECURITY',
  'ANNOUNCEMENT',
];

@Injectable()
export class UpdatePreferencesUseCase {
  constructor(
    @Inject(NotificationPreferenceRepository)
    private readonly preferenceRepository: NotificationPreferenceRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferenceResponse> {
    const actor = requireCommunicationActor(context);

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_PREFERENCE_UPDATE_OWN, workspace: actor },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const channel = input.channel.toUpperCase() as NotificationPreferenceChannelContract;
    const category = input.category.toUpperCase() as NotificationPreferenceCategoryContract;

    if (!CHANNELS.includes(channel)) {
      throw new AppError('VALIDATION_ERROR', `invalid channel: ${input.channel}`, 400);
    }
    if (!CATEGORIES.includes(category)) {
      throw new AppError('VALIDATION_ERROR', `invalid category: ${input.category}`, 400);
    }

    let preference = await this.preferenceRepository.findUnique({
      workspaceId: actor.workspaceId,
      userId: actor.actorId,
      channel,
      category,
    });

    if (preference) {
      preference = new NotificationPreference({
        ...preference,
        enabled: input.enabled,
        updatedAt: new Date(),
      });
    } else {
      preference = new NotificationPreference({
        id: randomUUID(),
        tenantId: actor.tenantId,
        workspaceId: actor.workspaceId,
        userId: actor.actorId,
        channel,
        category,
        enabled: input.enabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const saved = await this.preferenceRepository.save(preference);
    return mapNotificationPreferenceToResponse(saved);
  }
}
