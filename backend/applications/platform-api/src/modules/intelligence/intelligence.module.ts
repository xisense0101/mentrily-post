import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { FoundationModule } from '../../foundation/foundation.module.js';
import {
  GetDashboardSummaryUseCase,
  GetMultiWorkspaceDashboardUseCase,
} from './application/index.js';
import { IntelligenceController } from './presentation/index.js';

@Module({
  imports: [DataPlatformModule, FoundationModule],
  providers: [GetDashboardSummaryUseCase, GetMultiWorkspaceDashboardUseCase],
  controllers: [IntelligenceController],
  exports: [GetDashboardSummaryUseCase, GetMultiWorkspaceDashboardUseCase],
})
export class IntelligenceModule {}
