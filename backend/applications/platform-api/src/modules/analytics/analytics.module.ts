import { Module } from '@nestjs/common';
import { DataPlatformModule } from '@mentrily/data-platform';
import { AnalyticsDashboardReadModelService } from './application/analytics-dashboard-read-model.service.js';
import { AnalyticsEventNormalizerService } from './application/analytics-event-normalizer.service.js';

@Module({
  imports: [DataPlatformModule],
  providers: [AnalyticsEventNormalizerService, AnalyticsDashboardReadModelService],
  exports: [AnalyticsEventNormalizerService, AnalyticsDashboardReadModelService],
})
export class AnalyticsModule {}
