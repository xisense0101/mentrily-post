import { describe, expect, it, vi } from 'vitest';
import type { PermissionEvaluator } from '@mentrily/service-core';
import { GetCodingAssessmentAnalyticsUseCase } from '../application/use-cases/get-coding-assessment-analytics.use-case.js';
import {
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
  createAssessmentRequestContext,
} from './assessment-test-fixtures.js';
import {
  AssessmentRepository,
  AssessmentSnapshotRepository,
} from '../domain/repositories/index.js';
import { PrismaService } from '@mentrily/data-platform';

function createPermissionEvaluator(allowed: boolean): PermissionEvaluator {
  return { evaluate: vi.fn(async () => ({ allowed })) };
}

describe('GetCodingAssessmentAnalyticsUseCase', () => {
  it('correctly aggregates statistics for coding questions', async () => {
    const mockAssessment = {
      id: 'assessment-1',
      workspaceId: TEST_WORKSPACE_ID,
      tenantId: TEST_TENANT_ID,
    };

    const mockSnapshot = {
      id: 'snapshot-1',
      assessmentId: 'assessment-1',
      versionId: 'version-1',
      versionNumber: 1,
      sections: [
        {
          id: 'section-1',
          title: 'Coding Challenges',
          position: 1,
          questions: [
            {
              id: 'q-1',
              kind: 'CODE',
              title: 'Two Sum',
              position: 1,
            },
          ],
        },
      ],
      looseQuestions: [],
    };

    const mockAttempts = [
      {
        id: 'attempt-1',
        submittedAt: new Date(),
        answers: [
          {
            questionId: 'q-1',
            questionKind: 'CODE',
            answer: { language: 'python', sourceCode: 'def two_sum(): pass' },
          },
        ],
        gradingRuns: [
          {
            status: 'COMPLETED',
            answerGrades: [
              {
                questionId: 'q-1',
                questionKind: 'CODE',
                status: 'AUTO_GRADED',
                score: { value: 10 },
                maxScore: { value: 10 },
                feedback: {
                  verdict: 'ACCEPTED',
                  publicTestResults: [{ passed: true }, { passed: true }],
                  passedHiddenCount: 3,
                  totalHiddenCount: 3,
                },
              },
            ],
          },
        ],
      },
      {
        id: 'attempt-2',
        submittedAt: new Date(),
        answers: [
          {
            questionId: 'q-1',
            questionKind: 'CODE',
            answer: { language: 'javascript', sourceCode: 'function twoSum() {}' },
          },
        ],
        gradingRuns: [
          {
            status: 'COMPLETED',
            answerGrades: [
              {
                questionId: 'q-1',
                questionKind: 'CODE',
                status: 'AUTO_GRADED',
                score: { value: 8 },
                maxScore: { value: 10 },
                feedback: {
                  verdict: 'WRONG_ANSWER',
                  publicTestResults: [{ passed: true }, { passed: false }],
                  passedHiddenCount: 2,
                  totalHiddenCount: 3,
                },
              },
            ],
          },
        ],
      },
    ];

    const mockPrisma = {
      assessmentAttempt: {
        findMany: vi.fn().mockResolvedValue(mockAttempts),
      },
    } as unknown as PrismaService;

    const mockRepo = {
      findById: vi.fn().mockResolvedValue(mockAssessment),
    } as unknown as AssessmentRepository;

    const mockSnapshotRepo = {
      findLatestByAssessmentId: vi.fn().mockResolvedValue(mockSnapshot),
    } as unknown as AssessmentSnapshotRepository;

    const useCase = new GetCodingAssessmentAnalyticsUseCase(
      mockPrisma,
      mockRepo,
      mockSnapshotRepo,
      createPermissionEvaluator(true),
    );

    const result = await useCase.execute(createAssessmentRequestContext(), 'assessment-1');

    expect(result.assessmentId).toBe('assessment-1');
    expect(result.overview.totalCodingAnswers).toBe(2);
    expect(result.overview.gradedCodingAnswers).toBe(2);
    expect(result.overview.averageScorePercent).toBe(90); // (100 + 80) / 2 = 90
    expect(result.overview.passRatePercent).toBe(50); // 1 passed out of 2

    expect(result.languageDistribution).toContainEqual({
      language: 'python',
      displayName: 'Python 3',
      count: 1,
    });
    expect(result.languageDistribution).toContainEqual({
      language: 'javascript',
      displayName: 'JavaScript',
      count: 1,
    });

    expect(result.verdictDistribution).toContainEqual({
      verdict: 'ACCEPTED',
      count: 1,
    });
    expect(result.verdictDistribution).toContainEqual({
      verdict: 'WRONG_ANSWER',
      count: 1,
    });

    expect(result.questionPerformance).toHaveLength(1);
    const qPerf = result.questionPerformance[0]!;
    expect(qPerf.questionId).toBe('q-1');
    expect(qPerf.title).toBe('Two Sum');
    expect(qPerf.gradedAnswers).toBe(2);
    expect(qPerf.averageScorePercent).toBe(90);
    expect(qPerf.passRatePercent).toBe(50);
    expect(qPerf.publicPassedCount).toBe(1.5); // (2 + 1) / 2 = 1.5
    expect(qPerf.publicTotalCount).toBe(2);
    expect(qPerf.hiddenPassedCount).toBe(2.5); // (3 + 2) / 2 = 2.5
    expect(qPerf.hiddenTotalCount).toBe(3);

    // Verify strict privacy boundaries
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('sourceCode');
    expect(serialized).not.toContain('def two_sum'); // no source code
    expect(serialized).not.toContain('function twoSum');
    expect(serialized).not.toContain('testCaseId');
    expect(serialized).not.toContain('expectedOutput');
    expect(serialized).not.toContain('stdout');
    expect(serialized).not.toContain('stderr');
    expect(serialized).not.toContain('providerUrl');
    expect(serialized).not.toContain('token');
  });

  it('fails if permission is denied', async () => {
    const useCase = new GetCodingAssessmentAnalyticsUseCase(
      {} as any,
      {} as any,
      {} as any,
      createPermissionEvaluator(false),
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), 'assessment-1'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('fails if assessment is not found or not in workspace', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AssessmentRepository;

    const useCase = new GetCodingAssessmentAnalyticsUseCase(
      {} as any,
      mockRepo,
      {} as any,
      createPermissionEvaluator(true),
    );

    await expect(
      useCase.execute(createAssessmentRequestContext(), 'assessment-1'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
