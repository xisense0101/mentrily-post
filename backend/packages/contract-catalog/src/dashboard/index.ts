import type {
  AnalyticsDashboardActivityItemContract,
  AnalyticsDashboardMetricContract,
} from '../analytics/index.js';

export interface CreatorDashboardLearningMetricsContract {
  totalCourses: number;
  publishedCourses: number;
  activeEnrollments: number;
  lessonCompletions: number;
  courseCompletions: number;
  linkedAssessmentsCount: number;
  requiredAssessmentBlockersCount?: number;
  metrics: AnalyticsDashboardMetricContract[];
}

export interface CreatorDashboardAssessmentMetricsContract {
  totalAssessments: number;
  publishedAssessments: number;
  attemptsStarted: number;
  submissions: number;
  pendingGrading: number;
  resultsReleased: number;
  passRateReleased?: number;
  metrics: AnalyticsDashboardMetricContract[];
}

export interface CreatorDashboardContentMetricsContract {
  totalDocuments: number;
  publishedDocuments: number;
  recentlyUpdatedDocuments: number;
  metrics: AnalyticsDashboardMetricContract[];
}

export interface CreatorDashboardMediaMetricsContract {
  totalAssets: number;
  processingFailed: number;
  quarantinedAssets: number;
  metrics: AnalyticsDashboardMetricContract[];
}

export interface CreatorDashboardCommunicationMetricsContract {
  notificationIntentsCreated: number;
  delivered: number;
  failed: number;
  pendingDelivery: number;
  metrics: AnalyticsDashboardMetricContract[];
}

export interface CreatorDashboardCampaignMetricsContract {
  totalCampaigns: number;
  draftCampaigns: number;
  scheduledCampaigns: number;
  archivedCampaigns: number;
  metrics: AnalyticsDashboardMetricContract[];
}

export interface CreatorDashboardSummaryContract {
  workspaceId: string;
  generatedAt?: string;
  totalCourses?: number;
  totalPublishedCourses?: number;
  totalAssessments?: number;
  totalActiveAssessments?: number;
  pendingGradingCount?: number;
  contentDocumentsCount?: number;
  mediaAssetsCount?: number;
  failedQuarantinedMediaCount?: number;
  campaignsCount?: number;
  learning?: CreatorDashboardLearningMetricsContract;
  assessment?: CreatorDashboardAssessmentMetricsContract;
  content?: CreatorDashboardContentMetricsContract;
  media?: CreatorDashboardMediaMetricsContract;
  communication?: CreatorDashboardCommunicationMetricsContract;
  campaign?: CreatorDashboardCampaignMetricsContract;
}

export type DashboardSummaryContract = CreatorDashboardSummaryContract;
export type DashboardActivityItemContract = Omit<
  AnalyticsDashboardActivityItemContract,
  'category' | 'subjectType'
> & {
  category?: AnalyticsDashboardActivityItemContract['category'];
  subjectType?: AnalyticsDashboardActivityItemContract['subjectType'];
};

export interface MultiWorkspaceDashboardSummaryContract {
  workspaces: {
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    summary: Pick<
      CreatorDashboardSummaryContract,
      | 'workspaceId'
      | 'generatedAt'
      | 'totalCourses'
      | 'totalAssessments'
      | 'learning'
      | 'assessment'
      | 'content'
      | 'media'
      | 'campaign'
    >;
  }[];
}
