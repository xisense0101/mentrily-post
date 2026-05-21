import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentEditorPage } from '../routes';
import { clickElement, getByText, render, waitFor } from '@/testing';
import type { AssessmentContract } from '../types';

const mockUseAssessment = vi.fn();

vi.mock('../hooks', () => ({
  useAssessment: () => mockUseAssessment(),
}));

vi.mock('../api', () => ({
  assessmentApiClient: {},
}));

const MOCK_ASSESSMENT: AssessmentContract = {
  id: 'assessment-1',
  title: 'Midterm Exam',
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

function makeDefaultHookReturn(overrides: Record<string, unknown> = {}) {
  return {
    assessment: MOCK_ASSESSMENT,
    localSections: [],
    localLooseQuestions: [],
    localGradingRubrics: [],
    localGradingRules: [],
    loading: false,
    error: null,
    isSaving: false,
    isPublishing: false,
    isArchiving: false,
    isRestoring: false,
    isRenaming: false,
    refresh: vi.fn(),
    renameAssessment: vi.fn(),
    updateSettings: vi.fn(),
    saveContent: vi.fn(),
    publishAssessment: vi.fn(),
    archiveAssessment: vi.fn(),
    restoreAssessment: vi.fn(),
    appendSection: vi.fn(),
    updateSection: vi.fn(),
    removeSection: vi.fn(),
    appendQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    removeQuestion: vi.fn(),
    ...overrides,
  };
}

describe('AssessmentEditorPage', () => {
  beforeEach(() => {
    mockUseAssessment.mockReset();
  });

  it('renders the loading state', async () => {
    mockUseAssessment.mockReturnValue({
      assessment: null,
      localSections: [],
      localLooseQuestions: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
    });

    const rendered = await render(<AssessmentEditorPage assessmentId="assessment-1" />);
    expect(getByText(rendered.container, 'Loading assessment...')).toBeTruthy();
  });

  it('renders the editor shell', async () => {
    mockUseAssessment.mockReturnValue(makeDefaultHookReturn());

    const rendered = await render(<AssessmentEditorPage assessmentId="assessment-1" />);
    expect(
      rendered.container.querySelector('[data-testid="assessment-editor-shell"]'),
    ).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="assessment-editor-page"]')).toBeTruthy();
  });

  it('renders empty question state', async () => {
    mockUseAssessment.mockReturnValue(makeDefaultHookReturn());

    const rendered = await render(<AssessmentEditorPage assessmentId="assessment-1" />);
    expect(rendered.container.querySelector('[data-testid="question-list-empty"]')).toBeTruthy();
  });

  it('can append a question locally', async () => {
    const appendQuestion = vi.fn();
    mockUseAssessment.mockReturnValue(makeDefaultHookReturn({ appendQuestion }));

    const rendered = await render(<AssessmentEditorPage assessmentId="assessment-1" />);
    await clickElement(getByText(rendered.container, 'MCQ'));

    await waitFor(() => {
      expect(appendQuestion).toHaveBeenCalledWith('MCQ', undefined);
    });
  });

  it('renders archive status and disables editing', async () => {
    const archivedAssessment: AssessmentContract = {
      ...MOCK_ASSESSMENT,
      status: 'ARCHIVED',
    };

    mockUseAssessment.mockReturnValue(makeDefaultHookReturn({ assessment: archivedAssessment }));

    const rendered = await render(<AssessmentEditorPage assessmentId="assessment-1" />);
    expect(rendered.container.querySelector('[data-testid="restore-button"]')).toBeTruthy();
    expect(rendered.container.querySelector('[data-testid="archive-button"]')).toBeFalsy();
  });

  it('renders error state when loading fails', async () => {
    mockUseAssessment.mockReturnValue({
      assessment: null,
      localSections: [],
      localLooseQuestions: [],
      loading: false,
      error: 'Assessment loading failed.',
      refresh: vi.fn(),
    });

    const rendered = await render(<AssessmentEditorPage assessmentId="assessment-1" />);
    expect(rendered.container.querySelector('[data-testid="assessment-error-state"]')).toBeTruthy();
  });
});
