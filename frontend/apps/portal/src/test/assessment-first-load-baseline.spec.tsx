import { describe, expect, it, vi } from 'vitest';
import { render } from '@/testing';
import AssessmentsRoute from '@/app/(workspace)/assessments/page';
import AssessmentEditorRoute from '@/app/(workspace)/assessments/[assessmentId]/page';
import AssessmentAttemptStartRoute from '@/app/(workspace)/assessments/[assessmentId]/attempt/page';
import AttemptsRoute from '@/app/(workspace)/attempts/page';
import AttemptRoute from '@/app/(workspace)/attempts/[attemptId]/page';
import AttemptResultRoute from '@/app/(workspace)/attempts/[attemptId]/result/page';
import ManualReviewRoute from '@/app/(workspace)/grading/manual-review/page';
import GradingRunRoute from '@/app/(workspace)/grading/runs/[gradingRunId]/page';
import GradingResultRoute from '@/app/(workspace)/grading/results/[attemptId]/page';

vi.mock('@/modules/assessment-builder/routes', () => ({
  AssessmentsPage: () => <div data-testid="route-assessments">Assessments</div>,
  AssessmentEditorPage: ({ assessmentId }: { assessmentId: string }) => <div data-testid="route-assessment-editor">{assessmentId}</div>,
}));

vi.mock('@/modules/assessment-attempts/routes', () => ({
  AssessmentAttemptStartPage: ({ assessmentId }: { assessmentId: string }) => <div data-testid="route-attempt-start">{assessmentId}</div>,
  LearnerAttemptsPage: () => <div data-testid="route-attempts">Attempts</div>,
  AssessmentAttemptRunnerPage: ({ attemptId }: { attemptId: string }) => <div data-testid="route-attempt-runner">{attemptId}</div>,
}));

vi.mock('@/modules/assessment-results', () => ({
  LearnerResultPage: ({ attemptId }: { attemptId: string }) => <div data-testid="route-learner-result">{attemptId}</div>,
  InstructorResultPage: ({ attemptId }: { attemptId: string }) => <div data-testid="route-instructor-result">{attemptId}</div>,
}));

vi.mock('@/modules/assessment-grading', () => ({
  ManualReviewPage: () => <div data-testid="route-manual-review">Manual review</div>,
  GradingRunPage: ({ gradingRunId }: { gradingRunId: string }) => <div data-testid="route-grading-run">{gradingRunId}</div>,
}));

describe('Assessment first-load baseline', () => {
  it('renders the assessment workspace routes without backend dependencies', async () => {
    const assessments = await render(<AssessmentsRoute />);
    expect(assessments.container.querySelector('[data-testid="route-assessments"]')).toBeTruthy();

    const editorRoute = await AssessmentEditorRoute({ params: Promise.resolve({ assessmentId: 'assessment-1' }) });
    const editor = await render(editorRoute);
    expect(editor.container.querySelector('[data-testid="route-assessment-editor"]')?.textContent).toContain('assessment-1');

    const attemptStartRoute = await AssessmentAttemptStartRoute({ params: Promise.resolve({ assessmentId: 'assessment-1' }) });
    const attemptStart = await render(attemptStartRoute);
    expect(attemptStart.container.querySelector('[data-testid="route-attempt-start"]')?.textContent).toContain('assessment-1');

    const attempts = await render(<AttemptsRoute />);
    expect(attempts.container.querySelector('[data-testid="route-attempts"]')).toBeTruthy();

    const attemptRoute = await AttemptRoute({ params: Promise.resolve({ attemptId: 'attempt-1' }) });
    const attempt = await render(attemptRoute);
    expect(attempt.container.querySelector('[data-testid="route-attempt-runner"]')?.textContent).toContain('attempt-1');

    const attemptResultRoute = await AttemptResultRoute({ params: Promise.resolve({ attemptId: 'attempt-1' }) });
    const attemptResult = await render(attemptResultRoute);
    expect(attemptResult.container.querySelector('[data-testid="route-learner-result"]')?.textContent).toContain('attempt-1');

    const manualReview = await render(<ManualReviewRoute />);
    expect(manualReview.container.querySelector('[data-testid="route-manual-review"]')).toBeTruthy();

    const gradingRunRoute = await GradingRunRoute({ params: Promise.resolve({ gradingRunId: 'run-1' }) });
    const gradingRun = await render(gradingRunRoute);
    expect(gradingRun.container.querySelector('[data-testid="route-grading-run"]')?.textContent).toContain('run-1');

    const gradingResultRoute = await GradingResultRoute({ params: Promise.resolve({ attemptId: 'attempt-1' }) });
    const gradingResult = await render(gradingResultRoute);
    expect(gradingResult.container.querySelector('[data-testid="route-instructor-result"]')?.textContent).toContain('attempt-1');
  });
});
