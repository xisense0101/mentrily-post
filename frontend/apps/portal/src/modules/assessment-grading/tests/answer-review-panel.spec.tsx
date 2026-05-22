import { describe, expect, it, vi } from 'vitest';
import { render } from '@/testing';
import { AnswerReviewPanel } from '../components/review/answer-review-panel';

vi.mock('@/modules/assessment-attempts', () => ({
  createAssessmentAttemptAnswerFileReadUrl: vi.fn(async () => ({
    url: 'https://signed.example/file.pdf',
    method: 'GET',
    headers: {},
    expiresAt: '2026-05-22T00:00:00.000Z',
  })),
}));

describe('AnswerReviewPanel', () => {
  it('renders submitted file metadata for file upload answers', async () => {
    const rendered = await render(
      <AnswerReviewPanel
        item={{
          gradingRunId: 'run-1',
          answerGradeId: 'grade-1',
          attemptId: 'attempt-1',
          answerId: 'answer-1',
          assessmentId: 'assessment-1',
          snapshotId: 'snapshot-1',
          questionId: 'question-1',
          questionKind: 'FILE_UPLOAD',
          maxScore: 5,
          learnerAnswer: { mediaAssetIds: ['asset-1'] },
          submittedFiles: [
            {
              mediaAssetId: 'asset-1',
              filename: 'submission.pdf',
              contentType: 'application/pdf',
              fileCategory: 'DOCUMENT',
              status: 'AVAILABLE',
            },
          ],
          learnerPrincipalId: 'learner-1',
          status: 'PENDING_MANUAL_REVIEW',
          method: 'MANUAL_REVIEW',
        }}
      />,
    );

    expect(rendered.container.querySelector('[data-testid="submitted-file-review-list"]')).toBeTruthy();
    expect(rendered.container.textContent).toContain('submission.pdf');
  });
});
