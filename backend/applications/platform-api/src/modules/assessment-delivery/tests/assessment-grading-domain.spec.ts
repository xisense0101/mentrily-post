import { describe, expect, it } from 'vitest';
import {
  AssessmentAnswerGrade,
  AssessmentGradingRun,
  AssessmentGradeScore,
} from '../domain/index.js';

describe('Assessment grading domain', () => {
  function createGrade(answerId: string, questionKind: 'MCQ' | 'LONG_ANSWER' | 'CODE') {
    return AssessmentAnswerGrade.createNotGraded({
      id: `grade-${answerId}`,
      attemptId: 'attempt-1',
      answerId,
      questionId: `question-${answerId}`,
      questionKind,
      maxScore: AssessmentGradeScore.create(2),
    });
  }

  it('marks answer auto graded', () => {
    const grade = createGrade('answer-1', 'MCQ');
    grade.markAutoGraded(AssessmentGradeScore.create(2, grade.maxScore));
    expect(grade.status).toBe('AUTO_GRADED');
    expect(grade.score?.value).toBe(2);
  });

  it('keeps manual review pending without score', () => {
    const grade = createGrade('answer-2', 'LONG_ANSWER');
    grade.markPendingManualReview();
    expect(grade.status).toBe('PENDING_MANUAL_REVIEW');
    expect(grade.score).toBeUndefined();
  });

  it('supports failed grade metadata', () => {
    const grade = createGrade('answer-3', 'CODE');
    grade.markFailed(undefined, { reason: 'execution_disabled' });
    expect(grade.status).toBe('GRADING_FAILED');
    expect(grade.metadata.reason).toBe('execution_disabled');
  });

  it('score cannot exceed max score', () => {
    const grade = createGrade('answer-4', 'MCQ');
    expect(() => grade.markAutoGraded(AssessmentGradeScore.create(3, grade.maxScore))).toThrow(
      'AssessmentGradeScore cannot exceed maxScore',
    );
  });

  it('grading run completed when all answers are graded', () => {
    const run = AssessmentGradingRun.start({
      id: 'run-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      attemptId: 'attempt-1',
      assessmentId: 'assessment-1',
      snapshotId: 'snapshot-1',
    });
    const grade = createGrade('answer-5', 'MCQ');
    grade.markAutoGraded(AssessmentGradeScore.create(2, grade.maxScore));
    run.addAnswerGrade(grade);
    run.markCompleted();
    expect(run.status).toBe('COMPLETED');
    expect(run.totalScore?.value).toBe(2);
    expect(run.maxScore?.value).toBe(2);
  });

  it('grading run partial when manual review exists', () => {
    const run = AssessmentGradingRun.start({
      id: 'run-2',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      attemptId: 'attempt-1',
      assessmentId: 'assessment-1',
      snapshotId: 'snapshot-1',
    });
    const auto = createGrade('answer-6', 'MCQ');
    auto.markAutoGraded(AssessmentGradeScore.create(2, auto.maxScore));
    const manual = createGrade('answer-7', 'LONG_ANSWER');
    manual.markPendingManualReview();
    run.addAnswerGrade(auto);
    run.addAnswerGrade(manual);
    run.markPartial();
    expect(run.status).toBe('PARTIAL');
    expect(run.totalScore?.value).toBe(2);
    expect(run.maxScore?.value).toBe(4);
  });
});
