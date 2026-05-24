export interface CourseAssessmentProgressSummaryResponse {
  courseId: string;
  totalLinkedAssessments: number;
  requiredAssessments: number;
  learnersAssigned: number;
  attemptsStarted: number;
  submissions: number;
  pendingGrading: number;
  resultsReleased: number;
  blockedRequiredAssessments: number;
  completedRequiredAssessments: number;
  passRate?: number | undefined;
}
