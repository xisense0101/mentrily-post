import { randomUUID } from 'node:crypto';
import { AssessmentAnswerGrade } from '../entities/assessment-answer-grade.entity.js';
import { AssessmentAttemptAnswer, AssessmentQuestion } from '../entities/index.js';
import { AssessmentGradeScore } from '../value-objects/assessment-grade-score.vo.js';
import { AssessmentExecutionStatusEnum } from '../value-objects/assessment-execution-status.vo.js';

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export class AssessmentAutoGradingService {
  gradeAnswer(input: {
    attemptId: string;
    answer: AssessmentAttemptAnswer;
    question: AssessmentQuestion;
    gradingRunId?: string;
  }): AssessmentAnswerGrade {
    const maxScore = AssessmentGradeScore.create(input.question.points.value());
    const grade = AssessmentAnswerGrade.createNotGraded({
      id: randomUUID(),
      attemptId: input.attemptId,
      answerId: input.answer.id,
      questionId: input.question.id,
      questionKind: input.question.kind,
      maxScore,
      metadata: input.gradingRunId ? { gradingRunId: input.gradingRunId } : {},
    });

    const answerKey = input.question.answerKey?.toObject();
    switch (input.question.kind) {
      case 'MCQ': {
        const selected = input.answer.answer.selectedOptionId;
        const correct = answerKey?.correctOptionIds;
        if (typeof selected !== 'string' || !isStringArray(correct) || correct.length !== 1) {
          grade.markPendingManualReview({ reason: 'invalid_mcq_answer_or_key' });
          return grade;
        }
        grade.markAutoGraded(
          AssessmentGradeScore.create(selected === correct[0] ? maxScore.value : 0, maxScore),
        );
        return grade;
      }
      case 'MULTI_SELECT': {
        const selected = input.answer.answer.selectedOptionIds;
        const correct = answerKey?.correctOptionIds;
        if (!isStringArray(selected) || !isStringArray(correct)) {
          grade.markPendingManualReview({ reason: 'invalid_multi_select_answer_or_key' });
          return grade;
        }
        const selectedSet = [...selected].sort();
        const correctSet = [...correct].sort();
        const exactMatch =
          selectedSet.length === correctSet.length &&
          selectedSet.every((value, index) => value === correctSet[index]);
        grade.markAutoGraded(
          AssessmentGradeScore.create(exactMatch ? maxScore.value : 0, maxScore),
        );
        return grade;
      }
      case 'TRUE_FALSE': {
        const value = input.answer.answer.value;
        const correctOptionIds = answerKey?.correctOptionIds;
        const truthyMetadata = input.question.metadata.trueFalseAnswer;
        let isCorrect: boolean | undefined;
        if (typeof truthyMetadata === 'boolean' && typeof value === 'boolean') {
          isCorrect = value === truthyMetadata;
        } else if (
          typeof value === 'boolean' &&
          isStringArray(correctOptionIds) &&
          correctOptionIds.length === 1
        ) {
          const expected = correctOptionIds[0]?.toLowerCase();
          if (expected === 'true' || expected === 'false') {
            isCorrect = value === (expected === 'true');
          }
        }
        if (isCorrect === undefined) {
          grade.markPendingManualReview({ reason: 'missing_true_false_answer_key' });
          return grade;
        }
        grade.markAutoGraded(AssessmentGradeScore.create(isCorrect ? maxScore.value : 0, maxScore));
        return grade;
      }
      case 'SHORT_ANSWER': {
        const text = input.answer.answer.text;
        const accepted = answerKey?.acceptedTextAnswers;
        if (typeof text !== 'string' || !isStringArray(accepted) || accepted.length === 0) {
          grade.markPendingManualReview({ reason: 'invalid_short_answer_or_key' });
          return grade;
        }
        const normalized = normalizeText(text);
        const matched = accepted.some((candidate) => normalizeText(candidate) === normalized);
        grade.markAutoGraded(AssessmentGradeScore.create(matched ? maxScore.value : 0, maxScore));
        return grade;
      }
      case 'LONG_ANSWER':
      case 'FILE_UPLOAD':
      case 'RUBRIC_ONLY':
      case 'READING_PASSAGE':
        grade.markPendingManualReview({ reason: 'manual_review_required' });
        return grade;
      case 'CODE':
      case 'NOTEBOOK':
        grade.markPendingManualReview({
          reason: 'manual_review_required',
          executionRequired: true,
          executionStatus: AssessmentExecutionStatusEnum.RESERVED,
          executionKind: input.question.kind,
        });
        return grade;
      default:
        grade.markFailed(undefined, { reason: 'unsupported_question_kind' });
        return grade;
    }
  }
}
