import { describe, expect, it, vi } from 'vitest';
import type { AuditRecorder, PermissionEvaluator, TransactionRunner } from '@mentrily/service-core';
import { CreateMediaUploadIntentUseCase } from '../application/use-cases/create-media-upload-intent.use-case.js';
import { MediaUploadPolicyService } from '../domain/services/index.js';
import { MediaEventPublisherService } from '../application/services/index.js';
import { FixtureObjectStorageAdapter } from '../infrastructure/storage/index.js';

describe('CreateMediaUploadIntentUseCase', () => {
  it('fails on missing context', async () => {
    const useCase = new CreateMediaUploadIntentUseCase(
      { save: vi.fn(), findById: vi.fn(), listByWorkspace: vi.fn() },
      { save: vi.fn(), findById: vi.fn(), findByAssetId: vi.fn() },
      { evaluate: vi.fn(async () => ({ allowed: true })) } as PermissionEvaluator,
      {
        run: async (operation) => operation({ transactionId: 'tx', client: {} }),
      } as TransactionRunner,
      { record: vi.fn() } as AuditRecorder,
      new FixtureObjectStorageAdapter(),
      new MediaUploadPolicyService(),
      { publishDomainEvent: vi.fn() } as unknown as MediaEventPublisherService,
    );

    await expect(
      useCase.execute(
        { requestId: 'r1', correlationId: 'c1', timestamp: new Date().toISOString() },
        {
          filename: 'file.pdf',
          contentType: 'application/pdf',
          fileCategory: 'DOCUMENT',
          maxSizeBytes: 1000,
        },
      ),
    ).rejects.toThrow();
  });
});
