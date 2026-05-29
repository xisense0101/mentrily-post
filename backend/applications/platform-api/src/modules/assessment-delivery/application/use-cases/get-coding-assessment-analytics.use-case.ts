import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@mentrily/data-platform';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
} from '@mentrily/service-core';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import {
  CodingAssessmentAnalyticsContract,
  CodingVerdictContract,
} from '@mentrily/contract-catalog';
import {
  AssessmentRepository,
  AssessmentSnapshotRepository,
} from '../../domain/repositories/index.js';
import { requireAssessmentActor } from '../support/index.js';

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  python: 'Python 3',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
};

@Injectable()
export class GetCodingAssessmentAnalyticsUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AssessmentRepository) private readonly repo: AssessmentRepository,
    @Inject(AssessmentSnapshotRepository)
    private readonly snapshotRepo: AssessmentSnapshotRepository,
    @Inject(PERMISSION_EVALUATOR) private readonly permissionEvaluator: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    assessmentId: string,
  ): Promise<CodingAssessmentAnalyticsContract> {
    const workspace = requireAssessmentActor(context);
    const perm = await this.permissionEvaluator.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_RESULT_READ_WORKSPACE, workspace },
      context,
    );
    if (!perm.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    const assessment = await this.repo.findById(assessmentId);
    if (!assessment || assessment.workspaceId !== workspace.workspaceId) {
      throw new AppError('NOT_FOUND', 'assessment not found', 404);
    }

    const snapshot = await this.snapshotRepo.findLatestByAssessmentId(assessmentId);
    if (!snapshot) {
      throw new AppError('NOT_FOUND', 'no published snapshot found for this assessment', 404);
    }

    // Extract coding questions from the snapshot
    const codingQuestions: Array<{ id: string; title: string; position: number }> = [];
    for (const section of snapshot.sections) {
      for (const q of section.questions) {
        if (q.kind === 'CODE') {
          codingQuestions.push({
            id: q.id,
            title: q.title,
            position: q.position,
          });
        }
      }
    }
    for (const q of snapshot.looseQuestions) {
      if (q.kind === 'CODE') {
        codingQuestions.push({
          id: q.id,
          title: q.title,
          position: q.position,
        });
      }
    }

    // Fetch all submitted attempts for this assessment
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        assessmentId,
        workspaceId: workspace.workspaceId,
        tenantId: workspace.tenantId,
        submittedAt: { not: null },
      },
      include: {
        answers: {
          where: { questionKind: 'CODE' },
        },
        gradingRuns: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          include: {
            answerGrades: {
              where: { questionKind: 'CODE' },
            },
          },
        },
      },
    });

    // Overview counters
    let totalCodingAnswers = 0;
    let gradedCodingAnswers = 0;
    let pendingManualReviewAnswers = 0;
    let gradingFailedAnswers = 0;
    let providerUnavailableCount = 0;

    const allScores: number[] = [];
    let passedCodingAnswers = 0;

    // Distributions
    const verdictCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};

    // Map coding questions to their performance stats
    const questionStatsMap = new Map<
      string,
      {
        gradedCount: number;
        scores: number[];
        passedCount: number;
        publicPassedSum: number;
        publicTotalMax: number;
        hiddenPassedSum: number;
        hiddenTotalMax: number;
        manualReviewCount: number;
        providerUnavailableCount: number;
        verdicts: Record<string, number>;
      }
    >();

    for (const q of codingQuestions) {
      questionStatsMap.set(q.id, {
        gradedCount: 0,
        scores: [],
        passedCount: 0,
        publicPassedSum: 0,
        publicTotalMax: 0,
        hiddenPassedSum: 0,
        hiddenTotalMax: 0,
        manualReviewCount: 0,
        providerUnavailableCount: 0,
        verdicts: {},
      });
    }

    for (const attempt of attempts) {
      const latestRun = attempt.gradingRuns[0];
      const gradesByQuestion = new Map(
        (latestRun?.answerGrades ?? []).map((g) => [g.questionId, g]),
      );

      for (const answer of attempt.answers) {
        const qId = answer.questionId;
        const stats = questionStatsMap.get(qId);
        if (!stats) continue;

        totalCodingAnswers++;

        // Track language usage from answer payload
        const answerPayload = answer.answer as Record<string, unknown> | null;
        const language =
          typeof answerPayload?.language === 'string' ? answerPayload.language : 'unknown';
        languageCounts[language] = (languageCounts[language] ?? 0) + 1;

        const grade = gradesByQuestion.get(qId);
        if (!grade) continue;

        const status = grade.status;
        const isGraded = status === 'AUTO_GRADED' || status === 'MANUALLY_GRADED';

        if (status === 'PENDING_MANUAL_REVIEW') {
          pendingManualReviewAnswers++;
          stats.manualReviewCount++;
        } else if (status === 'GRADING_FAILED') {
          gradingFailedAnswers++;
        }

        // Get verdict safely
        const feedback = grade.feedback as Record<string, unknown> | null;
        const metadata = grade.metadata as Record<string, unknown> | null;
        const rawVerdict = feedback?.verdict ?? metadata?.verdict;
        const verdict = typeof rawVerdict === 'string' ? rawVerdict : undefined;

        if (verdict) {
          verdictCounts[verdict] = (verdictCounts[verdict] ?? 0) + 1;
          stats.verdicts[verdict] = (stats.verdicts[verdict] ?? 0) + 1;
        }

        const isProviderUnavailable =
          verdict === 'PROVIDER_UNAVAILABLE' ||
          (grade.metadata as Record<string, unknown> | null)?.reason === 'provider_unavailable';

        if (isProviderUnavailable) {
          providerUnavailableCount++;
          stats.providerUnavailableCount++;
        }

        if (isGraded) {
          gradedCodingAnswers++;
          stats.gradedCount++;

          const score =
            grade.score !== null && typeof grade.score === 'object'
              ? (grade.score as { value: number }).value
              : typeof grade.score === 'number'
                ? grade.score
                : 0;

          const maxScore =
            grade.maxScore !== null && typeof grade.maxScore === 'object'
              ? (grade.maxScore as { value: number }).value
              : typeof grade.maxScore === 'number'
                ? grade.maxScore
                : 1;

          const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0;
          allScores.push(scorePct);
          stats.scores.push(scorePct);

          const isPassed = score >= maxScore;
          if (isPassed) {
            passedCodingAnswers++;
            stats.passedCount++;
          }

          // Public and Hidden Test cases counts
          if (feedback) {
            const rawPublic = feedback.publicTestResults;
            if (Array.isArray(rawPublic)) {
              const publicPassed = rawPublic.filter((tr) => tr && tr.passed === true).length;
              stats.publicPassedSum += publicPassed;
              stats.publicTotalMax = Math.max(stats.publicTotalMax, rawPublic.length);
            }

            const rawPassedHidden = feedback.passedHiddenCount;
            const rawTotalHidden = feedback.totalHiddenCount;

            const passedHidden = typeof rawPassedHidden === 'number' ? rawPassedHidden : 0;
            const totalHidden = typeof rawTotalHidden === 'number' ? rawTotalHidden : 0;

            stats.hiddenPassedSum += passedHidden;
            stats.hiddenTotalMax = Math.max(stats.hiddenTotalMax, totalHidden);
          }
        }
      }
    }

    const averageScorePercent =
      allScores.length > 0
        ? Math.round(allScores.reduce((sum, val) => sum + val, 0) / allScores.length)
        : null;

    const passRatePercent =
      gradedCodingAnswers > 0
        ? Math.round((passedCodingAnswers / gradedCodingAnswers) * 100)
        : null;

    // Map verdict distribution
    const verdictDistribution = Object.entries(verdictCounts).map(([verdict, count]) => ({
      verdict: verdict as CodingVerdictContract,
      count,
    }));

    // Map language distribution
    const languageDistribution = Object.entries(languageCounts).map(([language, count]) => ({
      language,
      displayName: LANGUAGE_DISPLAY_NAMES[language] ?? language,
      count,
    }));

    // Map question performance
    const questionPerformance = codingQuestions.map((q) => {
      const stats = questionStatsMap.get(q.id)!;

      const qAvgScore =
        stats.scores.length > 0
          ? Math.round(stats.scores.reduce((sum, val) => sum + val, 0) / stats.scores.length)
          : null;

      const qPassRate =
        stats.gradedCount > 0 ? Math.round((stats.passedCount / stats.gradedCount) * 100) : null;

      const publicPassedCount =
        stats.gradedCount > 0
          ? Math.round((stats.publicPassedSum / stats.gradedCount) * 10) / 10
          : 0;

      const hiddenPassedCount =
        stats.gradedCount > 0
          ? Math.round((stats.hiddenPassedSum / stats.gradedCount) * 10) / 10
          : 0;

      // Determine most common verdict
      let mostCommonVerdict: string | undefined;
      let maxVerdictCount = 0;
      for (const [verdict, count] of Object.entries(stats.verdicts)) {
        if (count > maxVerdictCount) {
          maxVerdictCount = count;
          mostCommonVerdict = verdict;
        }
      }

      return {
        questionId: q.id,
        title: q.title,
        position: q.position,
        gradedAnswers: stats.gradedCount,
        averageScorePercent: qAvgScore,
        passRatePercent: qPassRate,
        publicPassedCount,
        publicTotalCount: stats.publicTotalMax,
        hiddenPassedCount,
        hiddenTotalCount: stats.hiddenTotalMax,
        manualReviewCount: stats.manualReviewCount,
        providerUnavailableCount: stats.providerUnavailableCount,
        ...(mostCommonVerdict ? { mostCommonVerdict } : {}),
      };
    });

    return {
      assessmentId,
      generatedAt: new Date().toISOString(),
      overview: {
        totalCodingAnswers,
        gradedCodingAnswers,
        pendingManualReviewAnswers,
        gradingFailedAnswers,
        averageScorePercent,
        passRatePercent,
        providerUnavailableCount,
      },
      verdictDistribution,
      languageDistribution,
      questionPerformance,
    };
  }
}
