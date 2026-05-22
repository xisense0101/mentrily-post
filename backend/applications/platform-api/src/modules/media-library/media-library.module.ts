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
  MediaProcessingService,
  MediaSecurityScanService,
} from './application/index.js';
import {
  MEDIA_METADATA_EXTRACTOR,
  MEDIA_OBJECT_READER,
  MEDIA_OBJECT_WRITER,
  MEDIA_RENDITION_GENERATOR,
  MEDIA_VIRUS_SCANNER,
  MEDIA_DELIVERY_URL_SIGNER,
} from './application/ports/index.js';
import { MediaAccessPolicyService, MediaUploadPolicyService } from './domain/services/index.js';
import {
  MediaAssetRepository,
  MediaUploadIntentRepository,
  MediaProcessingJobRepository,
  MediaRenditionRepository,
  MediaSecurityScanJobRepository,
  MediaLifecycleJobRepository,
} from './domain/repositories/index.js';
import {
  FixtureObjectStorageAdapter,
  NoopObjectStorageAdapter,
  OBJECT_STORAGE_PORT,
  PrismaMediaAssetRepository,
  PrismaMediaUploadIntentRepository,
  PrismaMediaProcessingJobRepository,
  PrismaMediaRenditionRepository,
  PrismaMediaSecurityScanJobRepository,
  PrismaMediaLifecycleJobRepository,
  FixtureMediaMetadataExtractor,
  FixtureMediaRenditionGenerator,
  FixtureMediaObjectReader,
  FixtureMediaObjectWriter,
  FixtureMediaVirusScanner,
  ReservedCdnSignedUrlDeliveryAdapter,
  PrivateSignedUrlDeliveryAdapter,
} from './infrastructure/index.js';
import { MediaLibraryController } from './presentation/index.js';

@Module({
  imports: [DataPlatformModule, FoundationModule],
  providers: [
    MediaAccessPolicyService,
    MediaUploadPolicyService,
    { provide: MediaAssetRepository, useClass: PrismaMediaAssetRepository },
    { provide: MediaUploadIntentRepository, useClass: PrismaMediaUploadIntentRepository },
    { provide: MediaProcessingJobRepository, useClass: PrismaMediaProcessingJobRepository },
    { provide: MediaRenditionRepository, useClass: PrismaMediaRenditionRepository },
    { provide: MediaSecurityScanJobRepository, useClass: PrismaMediaSecurityScanJobRepository },
    { provide: MediaLifecycleJobRepository, useClass: PrismaMediaLifecycleJobRepository },
    { provide: OBJECT_STORAGE_PORT, useClass: NoopObjectStorageAdapter },
    { provide: MEDIA_METADATA_EXTRACTOR, useClass: FixtureMediaMetadataExtractor },
    { provide: MEDIA_RENDITION_GENERATOR, useClass: FixtureMediaRenditionGenerator },
    { provide: MEDIA_OBJECT_READER, useClass: FixtureMediaObjectReader },
    { provide: MEDIA_OBJECT_WRITER, useClass: FixtureMediaObjectWriter },
    { provide: MEDIA_VIRUS_SCANNER, useClass: FixtureMediaVirusScanner },
    { provide: MEDIA_DELIVERY_URL_SIGNER, useClass: ReservedCdnSignedUrlDeliveryAdapter },
    PrivateSignedUrlDeliveryAdapter,
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
    MediaProcessingService,
    MediaSecurityScanService,
    FixtureObjectStorageAdapter,
  ],
  controllers: [MediaLibraryController],
  exports: [
    MediaAssetRepository,
    MediaUploadIntentRepository,
    MediaProcessingJobRepository,
    MediaRenditionRepository,
    MediaSecurityScanJobRepository,
    MediaLifecycleJobRepository,
    OBJECT_STORAGE_PORT,
    MEDIA_METADATA_EXTRACTOR,
    MEDIA_RENDITION_GENERATOR,
    MEDIA_OBJECT_READER,
    MEDIA_OBJECT_WRITER,
    MEDIA_VIRUS_SCANNER,
    MEDIA_DELIVERY_URL_SIGNER,
    MediaProcessingService,
    MediaSecurityScanService,
    FixtureObjectStorageAdapter,
  ],
})
export class MediaLibraryModule {}
