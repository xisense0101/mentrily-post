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
  ArchiveContentDocumentUseCase,
  ContentEventPublisherService,
  CreateContentDocumentUseCase,
  GetContentDocumentUseCase,
  GetLatestContentSnapshotUseCase,
  ListContentDocumentsUseCase,
  PublishContentDocumentUseCase,
  ReplaceContentBlocksUseCase,
  RestoreContentDocumentUseCase,
  UpdateContentDocumentUseCase,
} from './application/index.js';
import {
  BlockTreePolicyService,
  ContentPublishPolicyService,
  ContentVersioningPolicyService,
} from './domain/services/index.js';
import {
  ContentDocumentRepository,
  ContentSnapshotRepository,
} from './domain/repositories/index.js';
import {
  PrismaContentDocumentRepository,
  PrismaContentSnapshotRepository,
} from './infrastructure/index.js';
import { ContentStudioController } from './presentation/index.js';

import { MediaLibraryModule } from '../media-library/media-library.module.js';

@Module({
  imports: [DataPlatformModule, FoundationModule, MediaLibraryModule],
  providers: [
    BlockTreePolicyService,
    ContentPublishPolicyService,
    ContentVersioningPolicyService,
    { provide: ContentDocumentRepository, useClass: PrismaContentDocumentRepository },
    { provide: ContentSnapshotRepository, useClass: PrismaContentSnapshotRepository },
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
          await repository.append(event as OutboxEvent<Record<string, unknown>>, context, transaction);
        },
      }),
      inject: [OutboxRepository],
    },
    ContentEventPublisherService,
    CreateContentDocumentUseCase,
    ListContentDocumentsUseCase,
    GetContentDocumentUseCase,
    UpdateContentDocumentUseCase,
    ReplaceContentBlocksUseCase,
    PublishContentDocumentUseCase,
    ArchiveContentDocumentUseCase,
    RestoreContentDocumentUseCase,
    GetLatestContentSnapshotUseCase,
  ],
  controllers: [ContentStudioController],
  exports: [ContentDocumentRepository, ContentSnapshotRepository],
})
export class ContentStudioModule {}
