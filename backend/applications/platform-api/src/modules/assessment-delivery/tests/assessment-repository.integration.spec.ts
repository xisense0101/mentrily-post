import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@mentrily/data-platform';
import { truncatePublicSchema } from '@mentrily/testing-toolkit';
import {
  PrismaAssessmentRepository,
  PrismaAssessmentSnapshotRepository,
} from '../infrastructure/index.js';
import {
  Assessment,
  AssessmentVersion,
  AssessmentSection,
  AssessmentQuestion,
  GradingRubric,
  GradingRule,
  AssessmentPurpose,
  QuestionOption,
  QuestionPoints,
  GradingModeEnum,
  AssessmentPurposeEnum,
  QuestionKindEnum,
  AssessmentVisibilityEnum,
  AttemptPolicy,
  TimeLimit,
  ResultReleasePolicyEnum,
} from '../domain/index.js';
import {
  TEST_ACTOR_ID,
  TEST_TENANT_ID,
  TEST_WORKSPACE_ID,
} from './assessment-test-fixtures.js';

describe('Assessment Delivery repositories (integration)', () => {
  let prisma: PrismaService;
  let assessmentRepo: PrismaAssessmentRepository;
  let snapshotRepo: PrismaAssessmentSnapshotRepository;

  beforeEach(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assessmentRepo = new PrismaAssessmentRepository(prisma);
    snapshotRepo = new PrismaAssessmentSnapshotRepository(prisma);
    await truncatePublicSchema(prisma);
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('saves and loads a draft assessment with deterministic order', async () => {
    const assessmentId = randomUUID();
    const versionId = randomUUID();

    const version = AssessmentVersion.createDraft({
      id: versionId,
      assessmentId,
      versionNumber: 1,
      sections: [],
      looseQuestions: [],
      createdByPrincipalId: TEST_ACTOR_ID,
      createdAt: new Date(),
    });

    const assessment = Assessment.createDraft({
      id: assessmentId,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      ownerPrincipalId: TEST_ACTOR_ID,
      purpose: AssessmentPurposeEnum.QUIZ as AssessmentPurpose,
      title: 'Draft Assessment',
      currentDraftVersion: version,
      visibility: AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy: AttemptPolicy.create({ allowRetake: false, shuffleQuestions: false, shuffleOptions: false }),
      timeLimit: TimeLimit.untimed(),
      resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
      metadata: {},
    });

    const section1 = AssessmentSection.create({
      id: randomUUID(),
      assessmentId,
      title: 'S1',
      position: 0,
      metadata: {},
      questions: [
        AssessmentQuestion.create({
          id: randomUUID(),
          assessmentId,
          kind: QuestionKindEnum.MCQ,
          title: 'Q1',
          prompt: { text: 'Q1' },
          options: [
            QuestionOption.create({ id: 'o1', label: 'A', value: 'a', isCorrect: true }),
            QuestionOption.create({ id: 'o2', label: 'B', value: 'b', isCorrect: false }),
          ],
          points: QuestionPoints.create(1),
          gradingMode: GradingModeEnum.AUTO,
          position: 0,
          metadata: {},
        }),
      ],
    });

    const newVersion = AssessmentVersion.createDraft({
      id: randomUUID(),
      assessmentId,
      versionNumber: 1,
      sections: [section1],
      looseQuestions: [
        AssessmentQuestion.create({
          id: randomUUID(),
          assessmentId,
          kind: QuestionKindEnum.MCQ,
          title: 'Loose Q',
          prompt: { text: 'Loose' },
          options: [
            QuestionOption.create({ id: 'o3', label: 'B', value: 'b', isCorrect: true }),
            QuestionOption.create({ id: 'o4', label: 'C', value: 'c', isCorrect: false }),
          ],
          points: QuestionPoints.create(2),
          gradingMode: GradingModeEnum.AUTO,
          position: 1,
          metadata: {},
        }),
      ],
      createdByPrincipalId: TEST_ACTOR_ID,
      createdAt: new Date(),
    });

    assessment.replaceDraftContent(newVersion);

    const saved = await assessmentRepo.save(assessment);
    const loaded = await assessmentRepo.findById(saved.id);

    expect(loaded?.id).toBe(saved.id);
    expect(loaded?.currentDraftVersion?.sections).toHaveLength(1);
    expect(loaded?.currentDraftVersion?.looseQuestions).toHaveLength(1);
    expect(loaded?.currentDraftVersion?.sections[0]?.questions).toHaveLength(1);
    expect(loaded?.tenantId).toBe(TEST_TENANT_ID);
    expect(loaded?.workspaceId).toBe(TEST_WORKSPACE_ID);
  });

  it('persists grading rubrics and rules', async () => {
    const assessmentId = randomUUID();
    const version = AssessmentVersion.createDraft({
      id: randomUUID(),
      assessmentId,
      versionNumber: 1,
      sections: [],
      looseQuestions: [],
      createdByPrincipalId: TEST_ACTOR_ID,
      createdAt: new Date(),
    });

    const assessment = Assessment.createDraft({
      id: assessmentId,
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      ownerPrincipalId: TEST_ACTOR_ID,
      purpose: AssessmentPurposeEnum.EXAM as AssessmentPurpose,
      title: 'Graded Exam',
      currentDraftVersion: version,
      visibility: AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy: AttemptPolicy.create({ allowRetake: false, shuffleQuestions: false, shuffleOptions: false }),
      timeLimit: TimeLimit.untimed(),
      resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
      metadata: {},
    });

    const rubric = GradingRubric.create({
      id: randomUUID(),
      assessmentId: assessment.id,
      title: 'Rubric 1',
      criteria: [{ id: randomUUID(), label: 'Correctness', maxPoints: 10 }],
    });

    const rule = GradingRule.create({
      id: randomUUID(),
      assessmentId: assessment.id,
      questionId: randomUUID(),
      mode: GradingModeEnum.AUTO,
      ruleType: 'EXACT_MATCH',
      config: { expected: 'yes' },
    });

    assessment.replaceGradingConfiguration([rubric], [rule]);

    const saved = await assessmentRepo.save(assessment);
    const loaded = await assessmentRepo.findById(saved.id);

    expect(loaded?.gradingRubrics).toHaveLength(1);
    expect(loaded?.gradingRules).toHaveLength(1);
    expect(loaded?.gradingRubrics[0]?.title).toBe('Rubric 1');
    expect(loaded?.gradingRules[0]?.ruleType).toBe('EXACT_MATCH');
  });

  it('publishes snapshot and loads latest snapshot', async () => {
    const assessment = Assessment.createDraft({
      id: randomUUID(),
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      ownerPrincipalId: TEST_ACTOR_ID,
      purpose: AssessmentPurposeEnum.QUIZ,
      title: 'Snapshot Test',
      visibility: AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy: AttemptPolicy.create({ allowRetake: false, shuffleQuestions: false, shuffleOptions: false }),
      timeLimit: TimeLimit.untimed(),
      resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
      metadata: {},
    });

    // Need at least one question to publish
    const newVersion = AssessmentVersion.createDraft({
      id: randomUUID(),
      assessmentId: assessment.id,
      versionNumber: 1,
      sections: [],
      looseQuestions: [
        AssessmentQuestion.create({
          id: randomUUID(),
          assessmentId: assessment.id,
          kind: QuestionKindEnum.MCQ,
          title: 'Q',
          prompt: { text: 'Q' },
          options: [
            QuestionOption.create({ id: 'o1', label: 'A', value: 'a', isCorrect: true }),
            QuestionOption.create({ id: 'o2', label: 'B', value: 'b', isCorrect: false }),
          ],
          points: QuestionPoints.create(1),
          gradingMode: GradingModeEnum.AUTO,
          position: 0,
          metadata: {},
        }),
      ],
      createdByPrincipalId: TEST_ACTOR_ID,
      createdAt: new Date(),
    });

    assessment.replaceDraftContent(newVersion);
    await assessmentRepo.save(assessment);

    assessment.publish(TEST_ACTOR_ID, randomUUID(), new Date());

    await snapshotRepo.save(assessment.publishedSnapshot!);
    await assessmentRepo.save(assessment);

    const latest = await snapshotRepo.findLatestByAssessmentId(assessment.id);
    expect(latest?.id).toBe(assessment.publishedSnapshot?.id);
    expect(latest?.versionNumber).toBe(1);
  });

  it('lists workspace assessments by purpose', async () => {
    const q1 = Assessment.createDraft({
      id: randomUUID(),
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      ownerPrincipalId: TEST_ACTOR_ID,
      purpose: AssessmentPurposeEnum.QUIZ as AssessmentPurpose,
      title: 'Q1',
      visibility: AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy: AttemptPolicy.create({ allowRetake: false, shuffleQuestions: false, shuffleOptions: false }),
      timeLimit: TimeLimit.untimed(),
      resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
      metadata: {},
    });
    const e1 = Assessment.createDraft({
      id: randomUUID(),
      tenantId: TEST_TENANT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      ownerPrincipalId: TEST_ACTOR_ID,
      purpose: AssessmentPurposeEnum.EXAM as AssessmentPurpose,
      title: 'E1',
      visibility: AssessmentVisibilityEnum.WORKSPACE,
      attemptPolicy: AttemptPolicy.create({ allowRetake: false, shuffleQuestions: false, shuffleOptions: false }),
      timeLimit: TimeLimit.untimed(),
      resultReleasePolicy: ResultReleasePolicyEnum.IMMEDIATE,
      metadata: {},
    });

    await assessmentRepo.save(q1);
    await assessmentRepo.save(e1);

    const quizzes = await assessmentRepo.listByPurpose(TEST_WORKSPACE_ID, 'QUIZ' as AssessmentPurpose);
    const all = await assessmentRepo.listByWorkspace(TEST_WORKSPACE_ID);

    expect(quizzes).toHaveLength(1);
    expect(quizzes[0]?.title).toBe('Q1');
    expect(all).toHaveLength(2);
  });
});
