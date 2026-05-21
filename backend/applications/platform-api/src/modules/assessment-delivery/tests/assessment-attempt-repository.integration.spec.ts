import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import {
  PrismaAssessmentAttemptRepository,
  PrismaAssessmentRepository,
  PrismaAssessmentSnapshotRepository,
} from '../infrastructure/index.js';
import {
  Assessment,
  AssessmentAttempt,
  AssessmentQuestion,
  AssessmentVersion,
  AssessmentPurposeEnum,
  AssessmentVisibilityEnum,
  AttemptPolicy,
  GradingModeEnum,
  QuestionOption,
  QuestionPoints,
  ResultReleasePolicyEnum,
  TimeLimit,
} from '../domain/index.js';
import { TEST_ACTOR_ID, TEST_TENANT_ID, TEST_WORKSPACE_ID } from './assessment-test-fixtures.js';

describe('Assessment attempt repository (integration)', () => {
  let prisma: PrismaService;
  let assessmentRepo: PrismaAssessmentRepository;
  let snapshotRepo: PrismaAssessmentSnapshotRepository;
  let attemptRepo: PrismaAssessmentAttemptRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assessmentRepo = new PrismaAssessmentRepository(prisma);
    snapshotRepo = new PrismaAssessmentSnapshotRepository(prisma);
    attemptRepo = new PrismaAssessmentAttemptRepository(prisma);
  });

  beforeEach(async () => {
    await truncatePublicSchema(prisma);
  });

  async function createPublishedAssessmentRecord() {
    const assessmentId = randomUUID();
    const snapshotId = randomUUID();
    const question = AssessmentQuestion.create({
      id: randomUUID(),
      assessmentId,
      kind: 'MCQ',
      title: 'Question',
      prompt: { text: 'Question' },
      options: [
        QuestionOption.create({ id: randomUUID(), label: 'A', value: 'a', isCorrect: true }),
        QuestionOption.create({ id: randomUUID(), label: 'B', value: 'b', isCorrect: false }),
      ],
      points: QuestionPoints.create(1),
      gradingMode: GradingModeEnum.AUTO,
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
      createdAt: new Date('2026-05-17T10:00:00.000Z'),
    });

    const assessment = Assessment.createDraft({
      id: assessmentId,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      ownerPrincipalId: TEST_ACTOR_ID,
      purpose: AssessmentPurposeEnum.QUIZ,
      title: 'Published Assessment',
      visibility: AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy: AttemptPolicy.create({
        allowRetake: false,
        shuffleQuestions: false,
        shuffleOptions: false,
      }),
      timeLimit: TimeLimit.create(15),
      resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
      metadata: {},
      gradingRubrics: [],
      gradingRules: [],
    });

    assessment.replaceDraftContent(version);
    await assessmentRepo.save(assessment);
    assessment.publish(TEST_ACTOR_ID, snapshotId, new Date('2026-05-17T10:05:00.000Z'));
    await snapshotRepo.save(assessment.publishedSnapshot!);
    await assessmentRepo.save(assessment);
    return { assessment, snapshot: assessment.publishedSnapshot!, question };
  }

  it('saves, reloads, and updates a persisted attempt aggregate', async () => {
    const { assessment, snapshot, question } = await createPublishedAssessmentRecord();
    const attempt = AssessmentAttempt.start({
      id: randomUUID(),
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      assessmentId: assessment.id,
      snapshotId: snapshot.id,
      snapshotVersionId: snapshot.versionId,
      snapshotVersionNumber: snapshot.versionNumber,
      learnerPrincipalId: TEST_ACTOR_ID,
      sessionId: randomUUID(),
      startedAt: new Date('2026-05-17T11:00:00.000Z'),
      expiresAt: new Date('2026-05-17T11:15:00.000Z'),
    });

    attempt.saveAnswer({
      answerId: randomUUID(),
      questionId: question.id,
      questionKind: question.kind,
      answer: { selectedOptionId: 'option-a' },
      metadata: { autosave: true },
    });

    const initialSave = await attemptRepo.save(attempt);
    expect(initialSave.answers).toHaveLength(1);
    expect(initialSave.session.expiresAt?.toISOString()).toBe('2026-05-17T11:15:00.000Z');

    attempt.saveAnswer({
      answerId: randomUUID(),
      questionId: question.id,
      questionKind: question.kind,
      answer: { selectedOptionId: 'option-b' },
    });
    attempt.submit(randomUUID());

    const finalSave = await attemptRepo.save(attempt);
    const loaded = await attemptRepo.findById(finalSave.id);

    expect(loaded?.status).toBe('SUBMITTED');
    expect(loaded?.answers).toHaveLength(1);
    expect(loaded?.answers[0]?.answer).toMatchObject({ selectedOptionId: 'option-b' });
    expect(loaded?.answers[0]?.status).toBe('SUBMITTED');
    expect(loaded?.result?.gradingStatus).toBe('NOT_GRADED');
  });
});
