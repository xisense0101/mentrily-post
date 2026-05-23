import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mediaProcessingHooksEnabled,
  runMediaProcessingHooks,
} from '../application/support/media-processing-hook.runner.js';
import type { MediaAsset } from '../domain/entities/media-asset.entity.js';
import type { MediaProcessingJob } from '../domain/entities/media-processing-job.entity.js';

const asset = { id: 'asset-1' } as MediaAsset;
const job = { id: 'job-1' } as MediaProcessingJob;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('runMediaProcessingHooks', () => {
  it('skips when feature flag is disabled', () => {
    vi.stubEnv('MEDIA_PROCESSING_HOOKS_ENABLED', 'false');
    expect(mediaProcessingHooksEnabled()).toBe(false);
    expect(
      runMediaProcessingHooks({
        asset,
        job,
        stage: 'PROCESSING_STARTED',
        processingSummary: {
          template: {
            key: 'IMAGE_STANDARD',
            name: 'Image Standard',
            description: 'desc',
            fileCategory: 'IMAGE',
          },
          metadata: {
            extractBasicMetadata: true,
            extractImageDimensions: true,
            extractDuration: false,
            extractChecksum: true,
          },
          plannedRenditions: [],
          completedHookStages: [],
        },
      }),
    ).toEqual({ completedStage: 'PROCESSING_STARTED', skipped: true });
  });

  it('runs registered stages when feature flag is enabled', () => {
    vi.stubEnv('MEDIA_PROCESSING_HOOKS_ENABLED', 'true');
    expect(
      runMediaProcessingHooks({
        asset,
        job,
        stage: 'PROCESSING_SUCCEEDED',
        processingSummary: {
          template: {
            key: 'IMAGE_STANDARD',
            name: 'Image Standard',
            description: 'desc',
            fileCategory: 'IMAGE',
          },
          metadata: {
            extractBasicMetadata: true,
            extractImageDimensions: true,
            extractDuration: false,
            extractChecksum: true,
          },
          plannedRenditions: [],
          completedHookStages: [],
        },
      }),
    ).toEqual({ completedStage: 'PROCESSING_SUCCEEDED', skipped: false });
  });
});
