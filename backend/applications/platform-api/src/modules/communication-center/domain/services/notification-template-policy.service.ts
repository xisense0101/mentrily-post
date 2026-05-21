import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import type { NotificationTemplate } from '../entities/index.js';
import type { NotificationChannel } from '../value-objects/index.js';
import { assertNotificationTemplateVariables } from '../value-objects/index.js';

@Injectable()
export class NotificationTemplatePolicyService {
  validateCreate(input: {
    channel: NotificationChannel;
    subjectTemplate?: string | undefined;
    bodyTemplate: string;
    variables: string[];
  }): void {
    if (!input.bodyTemplate.trim()) {
      throw new AppError('VALIDATION_ERROR', 'bodyTemplate is required', 400);
    }
    if (input.channel === 'EMAIL' && !input.subjectTemplate?.trim()) {
      throw new AppError('VALIDATION_ERROR', 'email templates require a subjectTemplate', 400);
    }
    assertNotificationTemplateVariables(input.variables);
  }

  assertCanRenderForIntent(template: NotificationTemplate): void {
    if (template.status !== 'ACTIVE') {
      throw new AppError('CONFLICT', 'template is not active for queued notification intents', 409);
    }
  }

  assertCanPreviewRender(template: NotificationTemplate): void {
    if (!template.canRender()) {
      throw new AppError('CONFLICT', 'template cannot be rendered', 409);
    }
  }
}
