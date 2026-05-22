import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RequestContext, TransactionContext } from '@mentrily/service-core';
import { MediaSecurityScanJobRepository } from '../../domain/repositories/media-security-scan-job.repository.js';
import type { MediaAsset } from '../../domain/entities/media-asset.entity.js';
import { MediaSecurityScanJob } from '../../domain/entities/media-security-scan-job.entity.js';

@Injectable()
export class MediaSecurityScanService {
  constructor(
    @Inject(MediaSecurityScanJobRepository)
    private readonly scanJobRepo: MediaSecurityScanJobRepository,
  ) {}

  async enqueueScanForAsset(
    context: RequestContext,
    asset: MediaAsset,
    transaction?: TransactionContext,
  ): Promise<MediaSecurityScanJob> {
    const provider = process.env.MEDIA_SECURITY_SCANNER_PROVIDER === 'CLAMAV_RESERVED' 
      ? 'CLAMAV_RESERVED' 
      : (process.env.MEDIA_SECURITY_SCANNER_PROVIDER === 'FIXTURE' ? 'FIXTURE' : 'NOOP');

    const idempotencyKey = `media-scan-${asset.id}`;
    
    const existingJobs = await this.scanJobRepo.findByAssetId(asset.id, transaction);
    const existing = existingJobs.find(j => j.idempotencyKey === idempotencyKey);
    if (existing && (existing.status === 'QUEUED' || existing.status === 'SCANNING')) {
      return existing;
    }

    const job = MediaSecurityScanJob.enqueue({
      id: randomUUID(),
      workspaceId: asset.workspaceId,
      mediaAssetId: asset.id,
      idempotencyKey,
      scannerProvider: provider,
    });

    return this.scanJobRepo.save(job, transaction);
  }
}
