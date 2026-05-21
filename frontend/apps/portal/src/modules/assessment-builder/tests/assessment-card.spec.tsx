import { describe, expect, it } from 'vitest';
import { AssessmentCard } from '../components/assessments';
import { getByText, render } from '@/testing';
import type { AssessmentContract } from '../types';

const MOCK_ASSESSMENT: AssessmentContract = {
  id: 'assessment-1',
  title: 'Midterm Exam 2026',
  purpose: 'EXAM',
  status: 'DRAFT',
  visibility: 'PRIVATE',
  ownerPrincipalId: 'principal-1',
  attemptPolicy: {},
  resultReleasePolicy: 'IMMEDIATE',
  metadata: {},
  gradingRubrics: [],
  gradingRules: [],
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z',
};

describe('AssessmentCard', () => {
  it('renders the assessment title', async () => {
    const rendered = await render(<AssessmentCard assessment={MOCK_ASSESSMENT} />);
    expect(getByText(rendered.container, 'Midterm Exam 2026')).toBeTruthy();
  });

  it('renders the status badge', async () => {
    const rendered = await render(<AssessmentCard assessment={MOCK_ASSESSMENT} />);
    expect(getByText(rendered.container, 'Draft')).toBeTruthy();
  });

  it('renders the purpose badge', async () => {
    const rendered = await render(<AssessmentCard assessment={MOCK_ASSESSMENT} />);
    expect(getByText(rendered.container, 'Exam')).toBeTruthy();
  });

  it('renders an anchor link when href is provided', async () => {
    const rendered = await render(
      <AssessmentCard assessment={MOCK_ASSESSMENT} href="/assessments/assessment-1" />,
    );

    const link = rendered.container.querySelector('[data-testid="assessment-open-link"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/assessments/assessment-1');
  });

  it('renders question count from draft version', async () => {
    const assessmentWithQuestions: AssessmentContract = {
      ...MOCK_ASSESSMENT,
      currentDraftVersion: {
        id: 'version-1',
        versionNumber: 1,
        status: 'DRAFT',
        createdByPrincipalId: 'principal-1',
        createdAt: '2026-05-14T00:00:00.000Z',
        sections: [],
        looseQuestions: [
          {
            id: 'q-1',
            kind: 'MCQ',
            title: 'Test question',
            prompt: { text: '' },
            options: [],
            points: 1,
            gradingMode: 'AUTO',
            position: 0,
          },
        ],
      },
    };

    const rendered = await render(<AssessmentCard assessment={assessmentWithQuestions} />);
    expect(getByText(rendered.container, '1 draft questions')).toBeTruthy();
  });
});
