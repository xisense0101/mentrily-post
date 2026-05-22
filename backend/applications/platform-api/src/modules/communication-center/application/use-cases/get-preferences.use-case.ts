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
import type { NotificationPreferencesResponse } from '../dto/index.js';
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
export class GetPreferencesUseCase {
  constructor(
    @Inject(NotificationPreferenceRepository)
    private readonly preferenceRepository: NotificationPreferenceRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(context: RequestContext): Promise<NotificationPreferencesResponse> {
    const actor = requireCommunicationActor(context);

    const permission = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.COMMUNICATION_PREFERENCE_READ_OWN, workspace: actor },
      context,
    );
    if (!permission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const dbPrefs = await this.preferenceRepository.listByUser({
      workspaceId: actor.workspaceId,
      userId: actor.actorId,
    });

    const preferences: NotificationPreference[] = [];
    for (const channel of CHANNELS) {
      for (const category of CATEGORIES) {
        const found = dbPrefs.find((p) => p.channel === channel && p.category === category);
        if (found) {
          preferences.push(found);
        } else {
          preferences.push(
            new NotificationPreference({
              id: randomUUID(),
              tenantId: actor.tenantId,
              workspaceId: actor.workspaceId,
              userId: actor.actorId,
              channel,
              category,
              enabled: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          );
        }
      }
    }

    return {
      preferences: preferences.map(mapNotificationPreferenceToResponse),
    };
  }
}
