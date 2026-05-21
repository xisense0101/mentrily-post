import { Module } from '@nestjs/common';
import {
  AuditRecordRepository,
  DataPlatformModule,
  OutboxRepository,
} from '@mentrily/data-platform';
import {
  AUDIT_RECORDER,
  OUTBOX_PUBLISHER,
  type AuditRecorder,
  type OutboxEvent,
  type OutboxPublisher,
  type RequestContext,
  type TransactionContext,
} from '@mentrily/service-core';
import { FoundationModule } from '../../foundation/foundation.module.js';
import {
  ArchiveMediaAssetUseCase,
  CompleteMediaUploadUseCase,
  CreateMediaUploadIntentUseCase,
  GetMediaAssetUseCase,
  GetMediaReadUrlUseCase,
  ListMediaAssetsUseCase,
  MediaEventPublisherService,
} from './application/index.js';
import { MediaAccessPolicyService, MediaUploadPolicyService } from './domain/services/index.js';
import { MediaAssetRepository, MediaUploadIntentRepository } from './domain/repositories/index.js';
import {
  FixtureObjectStorageAdapter,
  NoopObjectStorageAdapter,
  OBJECT_STORAGE_PORT,
  PrismaMediaAssetRepository,
  PrismaMediaUploadIntentRepository,
} from './infrastructure/index.js';
import { MediaLibraryController } from './presentation/index.js';

@Module({
  imports: [DataPlatformModule, FoundationModule],
  providers: [
    MediaAccessPolicyService,
    MediaUploadPolicyService,
    { provide: MediaAssetRepository, useClass: PrismaMediaAssetRepository },
    { provide: MediaUploadIntentRepository, useClass: PrismaMediaUploadIntentRepository },
    { provide: OBJECT_STORAGE_PORT, useClass: NoopObjectStorageAdapter },
    {
      provide: AUDIT_RECORDER,
      useFactory: (repository: AuditRecordRepository): AuditRecorder => ({
        async record(input, context, transaction) {
          await repository.append(input, context, transaction);
        },
      }),
      inject: [AuditRecordRepository],
    },
    {
      provide: OUTBOX_PUBLISHER,
      useFactory: (repository: OutboxRepository): OutboxPublisher => ({
        async publish<TPayload>(
          event: OutboxEvent<TPayload>,
          context: RequestContext,
          transaction?: TransactionContext,
        ): Promise<void> {
          await repository.append(
            event as OutboxEvent<Record<string, unknown>>,
            context,
            transaction,
          );
        },
      }),
      inject: [OutboxRepository],
    },
    MediaEventPublisherService,
    CreateMediaUploadIntentUseCase,
    CompleteMediaUploadUseCase,
    GetMediaAssetUseCase,
    GetMediaReadUrlUseCase,
    ListMediaAssetsUseCase,
    ArchiveMediaAssetUseCase,
    FixtureObjectStorageAdapter,
  ],
  controllers: [MediaLibraryController],
  exports: [
    MediaAssetRepository,
    MediaUploadIntentRepository,
    OBJECT_STORAGE_PORT,
    FixtureObjectStorageAdapter,
  ],
})
export class MediaLibraryModule {}
