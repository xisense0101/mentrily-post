import type {
  CreatorDashboardAssessmentMetricsContract,
  CreatorDashboardCampaignMetricsContract,
  CreatorDashboardCommunicationMetricsContract,
  CreatorDashboardContentMetricsContract,
  CreatorDashboardLearningMetricsContract,
  CreatorDashboardMediaMetricsContract,
} from '@mentrily/domain-contracts';
import { createDashboardApiClient } from '../../dashboard/api/dashboard-api-client';

const dashboardApiClient = createDashboardApiClient();

export const analyticsApiClient = {
  getCreatorLearningMetrics(): Promise<CreatorDashboardLearningMetricsContract> {
    return dashboardApiClient.getCreatorLearningMetrics();
  },
  getCreatorAssessmentMetrics(): Promise<CreatorDashboardAssessmentMetricsContract> {
    return dashboardApiClient.getCreatorAssessmentMetrics();
  },
  getCreatorContentMetrics(): Promise<CreatorDashboardContentMetricsContract> {
    return dashboardApiClient.getCreatorContentMetrics();
  },
  getCreatorMediaMetrics(): Promise<CreatorDashboardMediaMetricsContract> {
    return dashboardApiClient.getCreatorMediaMetrics();
  },
  getCreatorCommunicationMetrics(): Promise<CreatorDashboardCommunicationMetricsContract> {
    return dashboardApiClient.getCreatorCommunicationMetrics();
  },
  getCreatorCampaignMetrics(): Promise<CreatorDashboardCampaignMetricsContract> {
    return dashboardApiClient.getCreatorCampaignMetrics();
  },
};
