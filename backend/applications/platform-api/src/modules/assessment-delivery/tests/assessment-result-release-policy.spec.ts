import { describe, expect, it } from 'vitest';
import { AssessmentResultReleasePolicyService } from '../domain/services/index.js';

describe('AssessmentResultReleasePolicyService', () => {
  const service = new AssessmentResultReleasePolicyService();

  it('cannot release in-progress attempt', () => {
    expect(service.canReleaseResult({ attemptStatus: 'IN_PROGRESS', gradingStatus: 'GRADED', hasPendingManualReview: false }).allowed).toBe(false);
  });

  it('cannot release ungraded result', () => {
    expect(service.canReleaseResult({ attemptStatus: 'SUBMITTED', gradingStatus: 'NOT_GRADED', hasPendingManualReview: false }).allowed).toBe(false);
  });

  it('cannot release pending manual review result', () => {
    expect(service.canReleaseResult({ attemptStatus: 'SUBMITTED', gradingStatus: 'PENDING_MANUAL_REVIEW', hasPendingManualReview: true }).allowed).toBe(false);
  });

  it('can release graded result', () => {
    expect(service.canReleaseResult({ attemptStatus: 'SUBMITTED', gradingStatus: 'GRADED', hasPendingManualReview: false }).allowed).toBe(true);
  });

  it('released result is learner visible and unreleased is not', () => {
    expect(service.canLearnerViewResult({ attemptStatus: 'SUBMITTED', gradingStatus: 'RELEASED', releasedAt: new Date() }).allowed).toBe(true);
    expect(service.canLearnerViewResult({ attemptStatus: 'SUBMITTED', gradingStatus: 'GRADED' }).allowed).toBe(false);
  });
});
