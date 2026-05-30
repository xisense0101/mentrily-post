import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  PERMISSION_EVALUATOR,
  TRANSACTION_RUNNER,
  type PermissionEvaluator,
  type TransactionRunner,
} from '@mentrily/service-core';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import { AppModule } from '../../app.module.js';
import { registerCorrelationIdHook } from '../../../foundation/correlation-id.hook.js';
import { OBJECT_STORAGE_PORT } from '../../media-library/infrastructure/index.js';
import { FixtureObjectStorageAdapter } from '../../media-library/infrastructure/index.js';

describe.sequential('Coding Question Integration Loop (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const headers = {
    'x-request-id': '91111111-1111-4111-8111-111111111111',
    'x-correlation-id': '92222222-2222-4222-8222-222222222222',
    'x-tenant-id': '93333333-3333-4333-8333-333333333333',
    'x-workspace-id': '94444444-4444-4444-8444-444444444444',
    'x-actor-id': '95555555-5555-4555-8555-555555555555',
  } as const;

  beforeAll(async () => {
    const prismaRef: { current: PrismaService | undefined } = { current: undefined };
    const permissionEvaluator: PermissionEvaluator = { evaluate: async () => ({ allowed: true }) };
    const transactionRunner: TransactionRunner = {
      run: async <T>(operation: Parameters<TransactionRunner['run']>[0]): Promise<T> => {
        if (!prismaRef.current) {
          throw new Error('prismaRef not initialized');
        }
        return prismaRef.current.$transaction(async (tx) =>
          operation({ transactionId: 'tx-coding-question-integration-loop-test', client: tx }),
        ) as Promise<T>;
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_EVALUATOR)
      .useValue(permissionEvaluator)
      .overrideProvider(TRANSACTION_RUNNER)
      .useValue(transactionRunner)
      .overrideProvider(OBJECT_STORAGE_PORT)
      .useValue(new FixtureObjectStorageAdapter())
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      rawBody: true,
    });
    registerCorrelationIdHook(app.getHttpAdapter().getInstance());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
    prismaRef.current = prisma;
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  function expectHttpStatus(
    response: { statusCode: number; body: string },
    expected: number,
  ): void {
    if (response.statusCode !== expected) {
      throw new Error(
        `Expected HTTP ${expected} but received ${response.statusCode}. Body: ${response.body}`,
      );
    }
  }

  it('runs complete creator creation, publication, learner snapshot validation, grading, and result summary lifecycle without leaking tests', async () => {
    // 1. Creator creates an assessment
    const createRes = await app.inject({
      method: 'POST',
      url: '/workspace/assessments',
      headers,
      payload: { title: 'Coding Quiz Integration', purpose: 'QUIZ', timeLimitMinutes: 20 },
    });
    expectHttpStatus(createRes, 201);
    const assessment = createRes.json<{ id: string }>();

    const questionId = '96666666-6666-4666-8666-666666666666';

    // 2. Creator replaces content with a code question containing hidden test cases
    const replaceRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessments/${assessment.id}/content`,
      headers,
      payload: {
        sections: [],
        looseQuestions: [
          {
            id: questionId,
            kind: 'CODE',
            title: 'Solve Question',
            prompt: { text: 'Write a python function' },
            options: [],
            points: 10,
            gradingMode: 'AUTO',
            position: 0,
            metadata: {},
            answerKey: {
              codingConfig: {
                allowedLanguages: ['python'],
                starterCodeByLanguage: { python: 'def solve(x):\n  pass' },
                publicSampleTestCases: [
                  { id: 'sample-1', input: '1', expectedOutput: 'Echo stdin: 1' },
                ],
                publicGradedTestCases: [
                  { id: 'public-1', input: '2', expectedOutput: 'Echo stdin: 2', weight: 1 },
                ],
                hiddenGradedTestCases: [
                  { id: 'hidden-1', input: '3', expectedOutput: 'Echo stdin: 3', weight: 1 },
                ],
              },
            },
          },
        ],
      },
    });
    expectHttpStatus(replaceRes, 200);

    // 3. Creator publishes assessment
    const publishRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessment.id}/publish`,
      headers,
    });
    expectHttpStatus(publishRes, 201);

    // 4. Learner starts an attempt
    const startRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessments/${assessment.id}/attempts`,
      headers,
    });
    expectHttpStatus(startRes, 201);
    const attempt = startRes.json<{ id: string }>();

    // 5. Learner retrieves attempt snapshot and checks privacy
    const snapshotRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attempt.id}/snapshot`,
      headers,
    });
    expectHttpStatus(snapshotRes, 200);
    const snapshotData = snapshotRes.json<{
      looseQuestions: Array<{
        id: string;
        answerKey?: {
          codingLearnerConfig?: {
            allowedLanguages: string[];
            starterCodeByLanguage: Record<string, string>;
            publicSampleTestCases: Array<{ id: string; input: string; expectedOutput: string }>;
          };
          codingConfig?: unknown;
        };
      }>;
    }>();

    const q = snapshotData.looseQuestions[0]!;
    expect(q.id).toBe(questionId);
    expect(q.answerKey).toBeDefined();

    // Verify presence of codingLearnerConfig
    const config = q.answerKey?.codingLearnerConfig;
    expect(config).toBeDefined();
    expect(config?.allowedLanguages).toEqual(['python']);
    expect(config?.starterCodeByLanguage).toEqual({ python: 'def solve(x):\n  pass' });
    expect(config?.publicSampleTestCases).toEqual([
      { id: 'sample-1', input: '1', expectedOutput: 'Echo stdin: 1' },
    ]);

    // Verify ABSOLUTE ABSENCE of codingConfig, publicGradedTestCases, and hiddenGradedTestCases
    expect(q.answerKey?.codingConfig).toBeUndefined();
    expect((config as any).publicGradedTestCases).toBeUndefined();
    expect((config as any).hiddenGradedTestCases).toBeUndefined();

    // 6. Learner saves code response
    const saveRes = await app.inject({
      method: 'PUT',
      url: `/workspace/assessment-attempts/${attempt.id}/answers/${questionId}`,
      headers,
      payload: {
        questionId,
        questionKind: 'CODE',
        answer: { sourceCode: 'def solve(x):\n  return x', language: 'python' },
      },
    });
    expectHttpStatus(saveRes, 200);

    // 7. Learner submits attempt
    const submitRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attempt.id}/submit`,
      headers,
    });
    expectHttpStatus(submitRes, 201);

    // 8. Grade attempt
    const gradeRes = await app.inject({
      method: 'POST',
      url: `/workspace/assessment-attempts/${attempt.id}/grade`,
      headers,
    });
    expectHttpStatus(gradeRes, 201);
    const gradingRun = gradeRes.json<{
      status: string;
      totalScore: number;
    }>();
    expect(gradingRun.status).toBe('COMPLETED');
    expect(gradingRun.totalScore).toBe(10); // BOTH graded tests (public and hidden) matched the output, so 10/10 points

    // 9. Retrieve instructor results to verify score and privacy
    const attemptRes = await app.inject({
      method: 'GET',
      url: `/workspace/assessment-attempts/${attempt.id}/results/instructor`,
      headers,
    });
    expectHttpStatus(attemptRes, 200);
    const attemptData = attemptRes.json<{
      gradingStatus: string;
      score: number;
      maxScore: number;
      answers: Array<{
        questionId: string;
        codingResult?: {
          status: string;
          passedHiddenCount: number;
          totalHiddenCount: number;
          publicTestResults: Array<{
            index: number;
            passed: boolean;
            verdict: string;
          }>;
        };
      }>;
    }>();

    expect(attemptData.gradingStatus).toBe('GRADED');
    expect(attemptData.score).toBe(10);
    expect(attemptData.maxScore).toBe(10);

    const codeAns = attemptData.answers.find((a) => a.questionId === questionId);
    expect(codeAns).toBeDefined();
    expect(codeAns?.codingResult).toBeDefined();
    expect(codeAns?.codingResult?.status).toBe('AUTO_GRADED');
    expect(codeAns?.codingResult?.passedHiddenCount).toBe(1);
    expect(codeAns?.codingResult?.totalHiddenCount).toBe(1);

    // Verify privacy: Response JSON does NOT leak any hidden test details
    const responseJson = JSON.stringify(attemptData);
    expect(responseJson).not.toContain('hidden-1');
    expect(responseJson).not.toContain('Echo stdin: 3');
  });
});
