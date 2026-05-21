import { describe, expect, it } from 'vitest';
import {
  AssessmentAttempt,
  AssessmentAutoGradingService,
  AssessmentGradingPolicyService,
  AssessmentQuestion,
  QuestionKindEnum,
  AssessmentAttemptResult,
  QuestionAnswerKey,
  QuestionOption,
  QuestionPoints,
  GradingModeEnum,
} from '../domain/index.js';

describe('Assessment auto grading and policy', () => {
  const service = new AssessmentAutoGradingService();
  const policy = new AssessmentGradingPolicyService();

  function createQuestion(overrides: Partial<Parameters<typeof AssessmentQuestion.create>[0]>) {
    return AssessmentQuestion.create({
      id: 'question-1',
      assessmentId: 'assessment-1',
      kind: QuestionKindEnum.MCQ,
      title: 'Question',
      prompt: { text: 'Question' },
      options: [
        QuestionOption.create({ id: 'option-a', label: 'A', value: 'a', isCorrect: true }),
        QuestionOption.create({ id: 'option-b', label: 'B', value: 'b', isCorrect: false }),
      ],
      answerKey: QuestionAnswerKey.create({ correctOptionIds: ['option-a'] }),
      points: QuestionPoints.create(2),
      gradingMode: GradingModeEnum.AUTO,
      position: 0,
      metadata: {},
      ...overrides,
    });
  }

  function createSubmittedAttempt() {
    const attempt = AssessmentAttempt.start({
      id: 'attempt-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      assessmentId: 'assessment-1',
      snapshotId: 'snapshot-1',
      snapshotVersionId: 'version-1',
      snapshotVersionNumber: 1,
      learnerPrincipalId: 'learner-1',
      sessionId: 'session-1',
    });
    return attempt;
  }

  it('MCQ exact correct gets full score', () => {
    const question = createQuestion({});
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-1',
      questionId: question.id,
      questionKind: QuestionKindEnum.MCQ,
      answer: { selectedOptionId: 'option-a' },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.status).toBe('AUTO_GRADED');
    expect(grade.score?.value).toBe(2);
  });

  it('MCQ incorrect gets zero', () => {
    const question = createQuestion({});
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-2',
      questionId: question.id,
      questionKind: QuestionKindEnum.MCQ,
      answer: { selectedOptionId: 'option-b' },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.score?.value).toBe(0);
  });

  it('multi-select exact set match gets full score', () => {
    const question = createQuestion({
      kind: QuestionKindEnum.MULTI_SELECT,
      options: [
        QuestionOption.create({ id: 'option-a', label: 'A', value: 'a', isCorrect: true }),
        QuestionOption.create({ id: 'option-b', label: 'B', value: 'b', isCorrect: true }),
        QuestionOption.create({ id: 'option-c', label: 'C', value: 'c', isCorrect: false }),
      ],
      answerKey: QuestionAnswerKey.create({ correctOptionIds: ['option-a', 'option-b'] }),
    });
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-3',
      questionId: question.id,
      questionKind: QuestionKindEnum.MULTI_SELECT,
      answer: { selectedOptionIds: ['option-b', 'option-a'] },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.score?.value).toBe(2);
  });

  it('multi-select partial mismatch gets zero for now', () => {
    const question = createQuestion({
      kind: QuestionKindEnum.MULTI_SELECT,
      options: [
        QuestionOption.create({ id: 'option-a', label: 'A', value: 'a', isCorrect: true }),
        QuestionOption.create({ id: 'option-b', label: 'B', value: 'b', isCorrect: true }),
      ],
      answerKey: QuestionAnswerKey.create({ correctOptionIds: ['option-a', 'option-b'] }),
    });
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-4',
      questionId: question.id,
      questionKind: QuestionKindEnum.MULTI_SELECT,
      answer: { selectedOptionIds: ['option-a'] },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.score?.value).toBe(0);
  });

  it('short answer exact normalized match gets full score', () => {
    const question = createQuestion({
      kind: QuestionKindEnum.SHORT_ANSWER,
      options: [],
      answerKey: QuestionAnswerKey.create({ acceptedTextAnswers: ['Yes'] }),
    });
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-5',
      questionId: question.id,
      questionKind: QuestionKindEnum.SHORT_ANSWER,
      answer: { text: '  yes ' },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.score?.value).toBe(2);
  });

  it('long answer goes pending manual review', () => {
    const question = createQuestion({
      kind: QuestionKindEnum.LONG_ANSWER,
      options: [],
      gradingMode: GradingModeEnum.MANUAL,
    });
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-6',
      questionId: question.id,
      questionKind: QuestionKindEnum.LONG_ANSWER,
      answer: { text: 'essay' },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.status).toBe('PENDING_MANUAL_REVIEW');
  });

  it('code goes pending manual review', () => {
    const question = createQuestion({
      kind: QuestionKindEnum.CODE,
      options: [],
      gradingMode: GradingModeEnum.MANUAL,
    });
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-7',
      questionId: question.id,
      questionKind: QuestionKindEnum.CODE,
      answer: { sourceCode: 'print(1)' },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.status).toBe('PENDING_MANUAL_REVIEW');
    expect(grade.metadata).toMatchObject({
      executionRequired: true,
      executionStatus: 'RESERVED',
      executionKind: 'CODE',
    });
  });

  it('notebook goes pending manual review with execution metadata', () => {
    const question = createQuestion({
      kind: QuestionKindEnum.NOTEBOOK,
      options: [],
      gradingMode: GradingModeEnum.MANUAL,
    });
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-8',
      questionId: question.id,
      questionKind: QuestionKindEnum.NOTEBOOK,
      answer: { notebookJson: { cells: [] } },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.status).toBe('PENDING_MANUAL_REVIEW');
    expect(grade.metadata).toMatchObject({
      executionRequired: true,
      executionStatus: 'RESERVED',
      executionKind: 'NOTEBOOK',
    });
  });

  it('released result cannot be regraded', () => {
    const result = AssessmentAttemptResult.restore({
      id: 'result-1',
      attemptId: 'attempt-1',
      gradingStatus: 'RELEASED',
      createdAt: new Date(),
      updatedAt: new Date(),
      releasedAt: new Date(),
    });
    expect(policy.canRegradeAttemptResult(result)).toMatchObject({ allowed: false });
  });

  it('reading passage goes pending manual review without requiring an answer key', () => {
    const question = createQuestion({
      kind: QuestionKindEnum.READING_PASSAGE,
      options: [],
      points: QuestionPoints.create(0),
      gradingMode: GradingModeEnum.MANUAL,
      answerKey: undefined,
      prompt: {
        text: 'Read this first',
        passageTitle: 'Passage',
        passageBody: 'Body',
      },
    });
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-9',
      questionId: question.id,
      questionKind: QuestionKindEnum.READING_PASSAGE,
      answer: {},
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.status).toBe('PENDING_MANUAL_REVIEW');
  });

  it('file upload goes pending manual review without any storage integration', () => {
    const question = createQuestion({
      kind: QuestionKindEnum.FILE_UPLOAD,
      options: [],
      gradingMode: GradingModeEnum.MANUAL,
    });
    const attempt = createSubmittedAttempt();
    const answer = attempt.saveAnswer({
      answerId: 'answer-10',
      questionId: question.id,
      questionKind: QuestionKindEnum.FILE_UPLOAD,
      answer: { fileIds: [] },
    });
    answer.submit();
    const grade = service.gradeAnswer({ attemptId: attempt.id, answer, question });
    expect(grade.status).toBe('PENDING_MANUAL_REVIEW');
  });
});
