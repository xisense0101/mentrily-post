import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import {
  PrismaAssessmentAttemptRepository,
  PrismaAssessmentGradingRepository,
  PrismaAssessmentRepository,
  PrismaAssessmentSnapshotRepository,
} from '../infrastructure/index.js';
import {
  Assessment,
  AssessmentAttempt,
  AssessmentAutoGradingService,
  AssessmentQuestion,
  AssessmentPurposeEnum,
  AssessmentVisibilityEnum,
  AttemptPolicy,
  GradingModeEnum,
  QuestionPoints,
  ResultReleasePolicyEnum,
  AssessmentVersion,
  AssessmentGradingRun,
} from '../domain/index.js';
import {
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
} from './assessment-test-fixtures.js';

describe('Assessment grading repository (integration)', () => {
  let prisma: PrismaService;
  let assessmentRepo: PrismaAssessmentRepository;
  let snapshotRepo: PrismaAssessmentSnapshotRepository;
  let attemptRepo: PrismaAssessmentAttemptRepository;
  let gradingRepo: PrismaAssessmentGradingRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assessmentRepo = new PrismaAssessmentRepository(prisma);
    snapshotRepo = new PrismaAssessmentSnapshotRepository(prisma);
    attemptRepo = new PrismaAssessmentAttemptRepository(prisma);
    gradingRepo = new PrismaAssessmentGradingRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  async function createSubmittedAttempt() {
    const assessmentId = randomUUID();
    const snapshotId = randomUUID();
    const question = AssessmentQuestion.create({
      id: randomUUID(),
      assessmentId,
      kind: 'LONG_ANSWER',
      title: 'Explain',
      prompt: { text: 'Explain' },
      options: [],
      points: QuestionPoints.create(3),
      gradingMode: GradingModeEnum.MANUAL,
      position: 0,
      metadata: {},
    });
    const version = AssessmentVersion.createDraft({
      id: randomUUID(),
      assessmentId,
      versionNumber: 1,
      sections: [],
      looseQuestions: [question],
      createdByPrincipalId: TEST_ACTOR_ID,
      createdAt: new Date(),
    });
    const assessment = Assessment.createDraft({
      id: assessmentId,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      ownerPrincipalId: TEST_ACTOR_ID,
      purpose: AssessmentPurposeEnum.QUIZ,
      title: 'Assessment',
      visibility: AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy: AttemptPolicy.create({
        allowRetake: false,
        shuffleQuestions: false,
        shuffleOptions: false,
      }),
      resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
      metadata: {},
      gradingRubrics: [],
      gradingRules: [],
    });
    assessment.replaceDraftContent(version);
    await assessmentRepo.save(assessment);
    assessment.publish(TEST_ACTOR_ID, snapshotId, new Date());
    await snapshotRepo.save(assessment.publishedSnapshot!);
    await assessmentRepo.save(assessment);

    const attempt = AssessmentAttempt.start({
      id: randomUUID(),
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      assessmentId,
      snapshotId,
      snapshotVersionId: version.id,
      snapshotVersionNumber: 1,
      learnerPrincipalId: TEST_ACTOR_ID,
      sessionId: randomUUID(),
    });
    attempt.saveAnswer({
      answerId: randomUUID(),
      questionId: question.id,
      questionKind: question.kind,
      answer: { text: 'essay' },
    });
    attempt.submit(randomUUID());
    const savedAttempt = await attemptRepo.save(attempt);

    const autoGrading = new AssessmentAutoGradingService();
    const snapshot = await snapshotRepo.findById(snapshotId);
    const questionMap = new Map(snapshot!.getAllQuestions().map((item) => [item.id, item]));
    const run = AssessmentGradingRun.start({
      id: randomUUID(),
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      attemptId: savedAttempt.id,
      assessmentId,
      snapshotId,
      triggeredByPrincipalId: TEST_ACTOR_ID,
    });
    for (const answer of savedAttempt.answers) {
      run.addAnswerGrade(autoGrading.gradeAnswer({
        attemptId: savedAttempt.id,
        answer,
        question: questionMap.get(answer.questionId)!,
      }));
    }
    run.markPartial();
    return { attempt: savedAttempt, run };
  }

  it('persists and loads grading runs, latest run, and pending manual review', async () => {
    const { attempt, run } = await createSubmittedAttempt();
    const saved = await gradingRepo.saveRun(run);
    const loaded = await gradingRepo.findRunById(saved.id);
    const latest = await gradingRepo.findLatestRunByAttemptId(attempt.id);
    const pending = await gradingRepo.listPendingManualReview({ workspaceId: TEST_WORKSPACE_ID });

    expect(loaded?.id).toBe(saved.id);
    expect(loaded?.answerGrades).toHaveLength(1);
    expect(latest?.id).toBe(saved.id);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe('PENDING_MANUAL_REVIEW');
  });
});
