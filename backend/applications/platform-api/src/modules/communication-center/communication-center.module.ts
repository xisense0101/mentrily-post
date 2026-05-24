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
  ArchiveNotificationTemplateUseCase,
  CommunicationEventPublisherService,
  CreateNotificationIntentUseCase,
  CreateNotificationTemplateUseCase,
  GetNotificationIntentUseCase,
  GetNotificationTemplateUseCase,
  ListNotificationIntentsUseCase,
  ListNotificationTemplatesUseCase,
  MarkNotificationIntentDispatchedUseCase,
  MarkNotificationIntentFailedUseCase,
  NotificationSchedulerService,
  NotificationTemplateRendererService,
  ProcessDueNotificationIntentsUseCase,
  RenderNotificationTemplateUseCase,
  ListNotificationsUseCase,
  GetNotificationUseCase,
  MarkNotificationReadUseCase,
  MarkNotificationUnreadUseCase,
  MarkNotificationArchivedUseCase,
  GetUnreadCountUseCase,
  GetPreferencesUseCase,
  UpdatePreferencesUseCase,
} from './application/index.js';
import {
  NOTIFICATION_PROVIDER_CONFIG,
  loadNotificationProviderConfig,
  type NotificationProviderConfig,
} from './application/support/index.js';
import {
  NotificationDeliveryAttemptRepository,
  NotificationIntentPolicyService,
  NotificationIntentRepository,
  NotificationRecipientPolicyService,
  NotificationSchedulerPolicyService,
  NotificationTemplatePolicyService,
  NotificationTemplateRepository,
  NotificationPreferenceRepository,
} from './domain/index.js';
import {
  FixtureNotificationDeliveryProvider,
  NOTIFICATION_DELIVERY_PROVIDER_REGISTRY,
  NotificationDeliveryProviderFactory,
  NoopNotificationDeliveryProvider,
  PrismaNotificationDeliveryAttemptRepository,
  PrismaNotificationIntentRepository,
  PrismaNotificationTemplateRepository,
  ReservedEmailNotificationDeliveryProvider,
  ReservedSmsNotificationDeliveryProvider,
  ReservedPushNotificationDeliveryProvider,
  CommunicationProviderTransport,
  PrismaNotificationPreferenceRepository,
} from './infrastructure/index.js';
import { CommunicationCenterController } from './presentation/index.js';

@Module({
  imports: [DataPlatformModule, FoundationModule],
  providers: [
    NotificationTemplatePolicyService,
    NotificationIntentPolicyService,
    NotificationRecipientPolicyService,
    NotificationSchedulerPolicyService,
    NotificationTemplateRendererService,
    { provide: NotificationTemplateRepository, useClass: PrismaNotificationTemplateRepository },
    { provide: NotificationIntentRepository, useClass: PrismaNotificationIntentRepository },
    {
      provide: NotificationDeliveryAttemptRepository,
      useClass: PrismaNotificationDeliveryAttemptRepository,
    },
    { provide: NotificationPreferenceRepository, useClass: PrismaNotificationPreferenceRepository },
    {
      provide: NOTIFICATION_PROVIDER_CONFIG,
      useFactory: () => loadNotificationProviderConfig(process.env),
    },
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
    CommunicationEventPublisherService,
    CreateNotificationTemplateUseCase,
    GetNotificationTemplateUseCase,
    ListNotificationTemplatesUseCase,
    ArchiveNotificationTemplateUseCase,
    RenderNotificationTemplateUseCase,
    CreateNotificationIntentUseCase,
    GetNotificationIntentUseCase,
    ListNotificationIntentsUseCase,
    MarkNotificationIntentDispatchedUseCase,
    MarkNotificationIntentFailedUseCase,
    NotificationSchedulerService,
    ProcessDueNotificationIntentsUseCase,
    ListNotificationsUseCase,
    GetNotificationUseCase,
    MarkNotificationReadUseCase,
    MarkNotificationUnreadUseCase,
    MarkNotificationArchivedUseCase,
    GetUnreadCountUseCase,
    GetPreferencesUseCase,
    UpdatePreferencesUseCase,
    NoopNotificationDeliveryProvider,
    FixtureNotificationDeliveryProvider,
    CommunicationProviderTransport,
    {
      provide: ReservedEmailNotificationDeliveryProvider,
      useFactory: (config: NotificationProviderConfig, transport: CommunicationProviderTransport) =>
        new ReservedEmailNotificationDeliveryProvider(
          config,
          process.env.NODE_ENV === 'test',
          transport,
        ),
      inject: [NOTIFICATION_PROVIDER_CONFIG, CommunicationProviderTransport],
    },
    {
      provide: ReservedSmsNotificationDeliveryProvider,
      useFactory: (config: NotificationProviderConfig, transport: CommunicationProviderTransport) =>
        new ReservedSmsNotificationDeliveryProvider(
          config,
          process.env.NODE_ENV === 'test',
          transport,
        ),
      inject: [NOTIFICATION_PROVIDER_CONFIG, CommunicationProviderTransport],
    },
    {
      provide: ReservedPushNotificationDeliveryProvider,
      useFactory: (config: NotificationProviderConfig) =>
        new ReservedPushNotificationDeliveryProvider(config, process.env.NODE_ENV === 'test'),
      inject: [NOTIFICATION_PROVIDER_CONFIG],
    },
    {
      provide: NOTIFICATION_DELIVERY_PROVIDER_REGISTRY,
      useFactory: (
        config: NotificationProviderConfig,
        noopProvider: NoopNotificationDeliveryProvider,
        fixtureProvider: FixtureNotificationDeliveryProvider,
        reservedEmailProvider: ReservedEmailNotificationDeliveryProvider,
        reservedSmsProvider: ReservedSmsNotificationDeliveryProvider,
        reservedPushProvider: ReservedPushNotificationDeliveryProvider,
      ) =>
        new NotificationDeliveryProviderFactory(
          config,
          process.env.NODE_ENV === 'test',
          noopProvider,
          fixtureProvider,
          reservedEmailProvider,
          reservedSmsProvider,
          reservedPushProvider,
        ),
      inject: [
        NOTIFICATION_PROVIDER_CONFIG,
        NoopNotificationDeliveryProvider,
        FixtureNotificationDeliveryProvider,
        ReservedEmailNotificationDeliveryProvider,
        ReservedSmsNotificationDeliveryProvider,
        ReservedPushNotificationDeliveryProvider,
      ],
    },
  ],
  controllers: [CommunicationCenterController],
  exports: [
    NotificationTemplateRepository,
    NotificationIntentRepository,
    NotificationDeliveryAttemptRepository,
    NotificationPreferenceRepository,
    NOTIFICATION_PROVIDER_CONFIG,
    NOTIFICATION_DELIVERY_PROVIDER_REGISTRY,
    NoopNotificationDeliveryProvider,
    FixtureNotificationDeliveryProvider,
    ReservedEmailNotificationDeliveryProvider,
    ReservedSmsNotificationDeliveryProvider,
    ReservedPushNotificationDeliveryProvider,
    NotificationSchedulerService,
    ProcessDueNotificationIntentsUseCase,
  ],
})
export class CommunicationCenterModule {}
