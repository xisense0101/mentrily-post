import { AppError } from '@mentrily/service-core';
import { SYSTEM_MEDIA_PROCESSING_HOOKS } from './media-processing-hook.registry.js';
import type { MediaProcessingHookContext } from './media-processing-hook.types.js';

export interface MediaProcessingHookRunResult {
  completedStage: MediaProcessingHookContext['stage'];
  skipped: boolean;
}

export function mediaProcessingHooksEnabled(): boolean {
  return process.env.MEDIA_PROCESSING_HOOKS_ENABLED === 'true';
}

export function runMediaProcessingHooks(
  context: MediaProcessingHookContext,
): MediaProcessingHookRunResult {
  if (!mediaProcessingHooksEnabled()) {
    return { completedStage: context.stage, skipped: true };
  }

  const supported = SYSTEM_MEDIA_PROCESSING_HOOKS.some((hook) =>
    hook.stages.includes(context.stage),
  );
  if (!supported) {
    throw new AppError('VALIDATION_ERROR', 'unsupported media processing hook stage', 400);
  }

  return { completedStage: context.stage, skipped: false };
}
