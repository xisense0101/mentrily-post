import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { FoundationModule } from '../../foundation/foundation.module.js';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import {
  GetDashboardSummaryUseCase,
  GetMultiWorkspaceDashboardUseCase,
} from './application/use-cases/index.js';
import { DashboardController } from './presentation/http/index.js';

@Module({
  imports: [DataPlatformModule, FoundationModule, AnalyticsModule],
  providers: [GetDashboardSummaryUseCase, GetMultiWorkspaceDashboardUseCase],
  controllers: [DashboardController],
  exports: [GetDashboardSummaryUseCase, GetMultiWorkspaceDashboardUseCase],
})
export class DashboardModule {}
