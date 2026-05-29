import { describe, it, expect } from 'vitest';
import {
  getCodingVerdictLabel,
  getCodingGradeStatusLabel,
  isAcceptedVerdict,
  isPendingManualReview,
  isGradingFailed,
} from '../lib/coding-result-view-model';
import type {
  CodingVerdictContract,
  CodingGradeStatusContract,
} from '@/contracts/assessment-delivery';

describe('coding-result-view-model', () => {
  describe('getCodingVerdictLabel', () => {
    const cases: Array<[CodingVerdictContract, string]> = [
      ['ACCEPTED', 'Accepted'],
      ['WRONG_ANSWER', 'Wrong answer'],
      ['COMPILE_ERROR', 'Compile error'],
      ['RUNTIME_ERROR', 'Runtime error'],
      ['TIME_LIMIT_EXCEEDED', 'Time limit exceeded'],
      ['MEMORY_LIMIT_EXCEEDED', 'Memory limit exceeded'],
      ['OUTPUT_LIMIT_EXCEEDED', 'Output limit exceeded'],
      ['PROVIDER_UNAVAILABLE', 'Execution provider unavailable'],
      ['VALIDATION_ERROR', 'Validation error'],
    ];

    cases.forEach(([verdict, label]) => {
      it(`maps ${verdict} → "${label}"`, () => {
        expect(getCodingVerdictLabel(verdict)).toBe(label);
      });
    });

    it('returns "No verdict" for undefined', () => {
      expect(getCodingVerdictLabel(undefined)).toBe('No verdict');
    });
  });

  describe('getCodingGradeStatusLabel', () => {
    const cases: Array<[CodingGradeStatusContract, string]> = [
      ['AUTO_GRADED', 'Auto graded'],
      ['PENDING_MANUAL_REVIEW', 'Pending manual review'],
      ['MANUALLY_GRADED', 'Manually graded'],
      ['GRADING_FAILED', 'Grading failed'],
    ];

    cases.forEach(([status, label]) => {
      it(`maps ${status} → "${label}"`, () => {
        expect(getCodingGradeStatusLabel(status)).toBe(label);
      });
    });
  });

  describe('isAcceptedVerdict', () => {
    it('returns true for ACCEPTED', () => {
      expect(isAcceptedVerdict('ACCEPTED')).toBe(true);
    });
    it('returns false for WRONG_ANSWER', () => {
      expect(isAcceptedVerdict('WRONG_ANSWER')).toBe(false);
    });
    it('returns false for undefined', () => {
      expect(isAcceptedVerdict(undefined)).toBe(false);
    });
  });

  describe('isPendingManualReview', () => {
    it('returns true for PENDING_MANUAL_REVIEW', () => {
      expect(isPendingManualReview('PENDING_MANUAL_REVIEW')).toBe(true);
    });
    it('returns false for AUTO_GRADED', () => {
      expect(isPendingManualReview('AUTO_GRADED')).toBe(false);
    });
  });

  describe('isGradingFailed', () => {
    it('returns true for GRADING_FAILED', () => {
      expect(isGradingFailed('GRADING_FAILED')).toBe(true);
    });
    it('returns false for AUTO_GRADED', () => {
      expect(isGradingFailed('AUTO_GRADED')).toBe(false);
    });
  });
});
