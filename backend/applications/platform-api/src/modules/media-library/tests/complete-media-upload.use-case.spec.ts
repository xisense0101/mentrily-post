import { describe, expect, it, vi } from 'vitest';
import type {
  AuditRecorder,
  PermissionEvaluator,
  RequestContext,
  TransactionRunner,
} from '@mentrily/service-core';
import { CompleteMediaUploadUseCase } from '../application/use-cases/complete-media-upload.use-case.js';
import { MediaAsset, MediaUploadIntent } from '../domain/entities/index.js';
import { MediaEventPublisherService, MediaProcessingService, MediaSecurityScanService } from '../application/services/index.js';

const context: RequestContext = {
  requestId: 'r1',
  correlationId: 'c1',
  timestamp: new Date().toISOString(),
  workspace: { tenantId: 't1', workspaceId: 'w1', actorId: 'p1' },
};

describe('CompleteMediaUploadUseCase', () => {
  it('marks asset available', async () => {
    const asset = MediaAsset.createPending({
      id: 'a1',
      tenantId: 't1',
      workspaceId: 'w1',
      ownerPrincipalId: 'p1',
      filename: 'file.pdf',
      contentType: 'application/pdf',
      fileCategory: 'DOCUMENT',
      storageProvider: 'FIXTURE',
      objectKey: 'tenants/t1/workspaces/w1/media/a1/file.pdf',
    });
    const intent = MediaUploadIntent.create({
      id: 'u1',
      tenantId: 't1',
      workspaceId: 'w1',
      assetId: 'a1',
      ownerPrincipalId: 'p1',
      objectKey: 'tenants/t1/workspaces/w1/media/a1/file.pdf',
      contentType: 'application/pdf',
      filename: 'file.pdf',
      fileCategory: 'DOCUMENT',
      maxSizeBytes: 1000,
      uploadUrl: 'https://fixture',
      uploadMethod: 'PUT',
      headers: {},
      expiresAt: new Date(Date.now() + 10000),
    });

    const useCase = new CompleteMediaUploadUseCase(
      {
        save: vi.fn(async (value) => value),
        findById: vi.fn(async () => asset),
        listByWorkspace: vi.fn(),
      },
      {
        save: vi.fn(async (value) => value),
        findById: vi.fn(async () => intent),
        findByAssetId: vi.fn(),
      },
      { evaluate: vi.fn(async () => ({ allowed: true })) } as PermissionEvaluator,
      {
        run: async (operation) => operation({ transactionId: 'tx', client: {} }),
      } as TransactionRunner,
      { record: vi.fn() } as AuditRecorder,
      { publishDomainEvent: vi.fn() } as unknown as MediaEventPublisherService,
      { enqueueJobsForAsset: vi.fn(async () => []) } as unknown as MediaProcessingService,
      { enqueueScanForAsset: vi.fn(async () => ({})) } as unknown as MediaSecurityScanService,
    );

    const response = await useCase.execute(context, 'u1');
    expect(response.status).toBe('AVAILABLE');
  });
});

