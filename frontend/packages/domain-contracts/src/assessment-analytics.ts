import type { CodingVerdictContract } from './assessment-delivery.js';

export interface CodingAssessmentAnalyticsContract {
  assessmentId: string;
  generatedAt: string;
  overview: {
    totalCodingAnswers: number;
    gradedCodingAnswers: number;
    pendingManualReviewAnswers: number;
    gradingFailedAnswers: number;
    averageScorePercent: number | null;
    passRatePercent: number | null;
    providerUnavailableCount: number;
  };
  verdictDistribution: Array<{
    verdict: CodingVerdictContract;
    count: number;
  }>;
  languageDistribution: Array<{
    language: string;
    displayName?: string;
    count: number;
  }>;
  questionPerformance: Array<{
    questionId: string;
    title: string;
    position?: number;
    gradedAnswers: number;
    averageScorePercent: number | null;
    passRatePercent: number | null;
    publicPassedCount: number;
    publicTotalCount: number;
    hiddenPassedCount: number;
    hiddenTotalCount: number;
    manualReviewCount: number;
    providerUnavailableCount: number;
    mostCommonVerdict?: string;
  }>;
}
