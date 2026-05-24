export interface DashboardSummaryContract {
  workspaceId: string;
  totalCourses: number;
  totalPublishedCourses: number;
  totalAssessments: number;
  totalActiveAssessments: number;
  pendingGradingCount: number;
  contentDocumentsCount: number;
  mediaAssetsCount: number;
  failedQuarantinedMediaCount: number;
  campaignsCount: number;
}

export interface DashboardActivityItemContract {
  id: string;
  type: string;
  title: string;
  description: string;
  occurredAt: string;
}

export interface MultiWorkspaceDashboardSummaryContract {
  workspaces: {
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    summary: DashboardSummaryContract;
  }[];
}
