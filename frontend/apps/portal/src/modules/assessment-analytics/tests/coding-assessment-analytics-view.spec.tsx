import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodingAssessmentAnalyticsView } from '../components/coding-assessment-analytics-view';
import * as assessmentApi from '@/modules/assessment-builder/api';

vi.mock('@/modules/assessment-builder/api', () => ({
  getAssessment: vi.fn(),
  getCodingAssessmentAnalytics: vi.fn(),
}));

describe('CodingAssessmentAnalyticsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(assessmentApi.getAssessment).mockReturnValue(new Promise(() => {}));
    vi.mocked(assessmentApi.getCodingAssessmentAnalytics).mockReturnValue(new Promise(() => {}));

    render(<CodingAssessmentAnalyticsView assessmentId="test-assessment-id" />);

    expect(screen.getByText('Aggregating coding analytics...')).toBeInTheDocument();
  });

  it('renders error state if data fetching fails', async () => {
    vi.mocked(assessmentApi.getAssessment).mockRejectedValue(
      new Error('Failed to load assessment'),
    );
    vi.mocked(assessmentApi.getCodingAssessmentAnalytics).mockRejectedValue(
      new Error('Failed to load analytics'),
    );

    render(<CodingAssessmentAnalyticsView assessmentId="test-assessment-id" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('Error Loading Analytics')).toBeInTheDocument();
  });

  it('renders analytics data successfully', async () => {
    const mockAssessment = {
      id: 'test-assessment-id',
      title: 'Advanced Algorithms Exam',
      description: 'Test Assessment',
      status: 'PUBLISHED',
      workspaceId: 'workspace-1',
      tenantId: 'tenant-1',
      createdAt: '2026-05-29T12:00:00Z',
      updatedAt: '2026-05-29T12:00:00Z',
      purpose: 'EXAM',
      durationMinutes: 120,
    } as any;

    const mockAnalytics = {
      assessmentId: 'test-assessment-id',
      generatedAt: '2026-05-29T15:00:00Z',
      overview: {
        totalCodingAnswers: 15,
        gradedCodingAnswers: 12,
        pendingManualReviewAnswers: 2,
        gradingFailedAnswers: 1,
        averageScorePercent: 85,
        passRatePercent: 75,
        providerUnavailableCount: 0,
      },
      verdictDistribution: [
        { verdict: 'ACCEPTED', count: 9 },
        { verdict: 'WRONG_ANSWER', count: 3 },
      ],
      languageDistribution: [
        { language: 'python', displayName: 'Python 3', count: 10 },
        { language: 'typescript', displayName: 'TypeScript', count: 5 },
      ],
      questionPerformance: [
        {
          questionId: 'q-1',
          title: 'Reverse Linked List',
          position: 1,
          gradedAnswers: 12,
          averageScorePercent: 90,
          passRatePercent: 80,
          publicPassedCount: 2.0,
          publicTotalCount: 2,
          hiddenPassedCount: 3.5,
          hiddenTotalCount: 4,
          manualReviewCount: 1,
          providerUnavailableCount: 0,
          mostCommonVerdict: 'ACCEPTED',
        },
      ],
    } as any;

    vi.mocked(assessmentApi.getAssessment).mockResolvedValue(mockAssessment);
    vi.mocked(assessmentApi.getCodingAssessmentAnalytics).mockResolvedValue(mockAnalytics);

    render(<CodingAssessmentAnalyticsView assessmentId="test-assessment-id" />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Algorithms Exam')).toBeInTheDocument();
    });

    // Verify overview
    expect(screen.getByText('15')).toBeInTheDocument(); // total submissions
    expect(screen.getByText('85%')).toBeInTheDocument(); // avg score
    expect(screen.getByText('75%')).toBeInTheDocument(); // pass rate

    // Verify language distribution display names
    expect(screen.getByText('Python 3')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();

    // Verify verdict distribution
    expect(screen.getAllByText('ACCEPTED')[0]).toBeInTheDocument();
    expect(screen.getByText('WRONG_ANSWER')).toBeInTheDocument();

    // Verify question performance table row
    expect(screen.getByText('Reverse Linked List')).toBeInTheDocument();
    expect(screen.getByText('q-1')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('3.5 / 4')).toBeInTheDocument();
  });
});
