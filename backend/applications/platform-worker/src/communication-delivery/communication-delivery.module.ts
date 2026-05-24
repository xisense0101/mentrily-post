import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { CommunicationCenterModule } from '../../../platform-api/src/modules/communication-center/communication-center.module.js';
import { CommunicationDeliveryWorker } from './communication-delivery.worker.js';

@Module({
  imports: [DataPlatformModule, CommunicationCenterModule],
  providers: [CommunicationDeliveryWorker],
  exports: [CommunicationDeliveryWorker],
})
export class CommunicationDeliveryModule {}
