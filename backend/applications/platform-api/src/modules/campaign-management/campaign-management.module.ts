import { Module } from '@nestjs/common';
import { CommunicationCenterModule } from '../communication-center/communication-center.module.js';
import { CampaignManagementController } from './presentation/http/index.js';

@Module({
  imports: [CommunicationCenterModule],
  controllers: [CampaignManagementController],
})
export class CampaignManagementModule {}
