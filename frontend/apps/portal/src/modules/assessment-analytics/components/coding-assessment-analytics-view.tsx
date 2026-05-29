'use client';

import React, { useEffect, useState } from 'react';
import { getAssessment, getCodingAssessmentAnalytics } from '@/modules/assessment-builder/api';
import type { CodingAssessmentAnalyticsContract } from '@mentrily/domain-contracts';
import type { AssessmentContract } from '@/modules/assessment-builder/types';

interface CodingAssessmentAnalyticsViewProps {
  assessmentId: string;
}

export function CodingAssessmentAnalyticsView({
  assessmentId,
}: CodingAssessmentAnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CodingAssessmentAnalyticsContract | null>(null);
  const [assessment, setAssessment] = useState<AssessmentContract | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, assessmentData] = await Promise.all([
        getCodingAssessmentAnalytics(assessmentId),
        getAssessment(assessmentId),
      ]);
      setAnalytics(analyticsData);
      setAssessment(assessmentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [assessmentId]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Aggregating coding analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <h3 style={styles.errorTitle}>Error Loading Analytics</h3>
          <p style={styles.errorMessage}>{error}</p>
          <button style={styles.retryButton} onClick={() => void loadData()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <h3 style={styles.errorTitle}>No Data</h3>
          <p style={styles.errorMessage}>No analytics data was generated for this assessment.</p>
        </div>
      </div>
    );
  }

  const { overview, verdictDistribution, languageDistribution, questionPerformance } = analytics;

  // Curated color HSL generators/palettes for modern visual design
  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'ACCEPTED':
        return {
          bg: 'hsla(142, 70%, 45%, 0.15)',
          text: 'hsl(142, 76%, 36%)',
          border: 'hsla(142, 70%, 45%, 0.3)',
        };
      case 'WRONG_ANSWER':
        return {
          bg: 'hsla(38, 92%, 50%, 0.15)',
          text: 'hsl(38, 92%, 40%)',
          border: 'hsla(38, 92%, 50%, 0.3)',
        };
      case 'TIME_LIMIT_EXCEEDED':
      case 'MEMORY_LIMIT_EXCEEDED':
        return {
          bg: 'hsla(16, 90%, 50%, 0.15)',
          text: 'hsl(16, 90%, 43%)',
          border: 'hsla(16, 90%, 50%, 0.3)',
        };
      case 'RUNTIME_ERROR':
      case 'COMPILATION_ERROR':
        return {
          bg: 'hsla(350, 80%, 50%, 0.15)',
          text: 'hsl(350, 80%, 42%)',
          border: 'hsla(350, 80%, 50%, 0.3)',
        };
      default:
        return {
          bg: 'hsla(210, 20%, 50%, 0.15)',
          text: 'hsl(210, 20%, 40%)',
          border: 'hsla(210, 20%, 50%, 0.3)',
        };
    }
  };

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
        return 'hsl(212, 85%, 45%)';
      case 'javascript':
      case 'typescript':
        return 'hsl(45, 95%, 50%)';
      case 'java':
        return 'hsl(16, 85%, 50%)';
      case 'cpp':
      case 'c':
        return 'hsl(200, 80%, 40%)';
      case 'go':
        return 'hsl(180, 75%, 45%)';
      case 'rust':
        return 'hsl(25, 75%, 40%)';
      default:
        return 'hsl(220, 15%, 50%)';
    }
  };

  const totalLanguagesCount = languageDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div style={styles.container} data-testid="coding-assessment-analytics-view">
      {/* Header Panel */}
      <div style={styles.headerPanel}>
        <div style={styles.headerInfo}>
          <div style={styles.eyebrow}>INSTRUCTOR CONSOLE</div>
          <h2 style={styles.title}>{assessment?.title || 'Coding Assessment'}</h2>
          <div style={styles.subtitle}>
            Workspace-scoped aggregate coding metrics. Last generated on{' '}
            <span style={{ fontWeight: 600 }}>
              {new Date(analytics.generatedAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div style={styles.headerActions}>
          <a href={`/assessments/${assessmentId}`} style={styles.backButton}>
            Back to Editor
          </a>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Code Submissions</div>
          <div style={styles.metricValue}>{overview.totalCodingAnswers}</div>
          <div style={styles.metricFooter}>
            {overview.gradedCodingAnswers} graded • {overview.pendingManualReviewAnswers} pending
            review
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Average Score</div>
          <div style={styles.metricValue}>
            {overview.averageScorePercent !== null ? `${overview.averageScorePercent}%` : 'N/A'}
          </div>
          <div style={styles.metricFooter}>Based on all graded coding submissions</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Overall Pass Rate</div>
          <div style={styles.metricValue}>
            {overview.passRatePercent !== null ? `${overview.passRatePercent}%` : 'N/A'}
          </div>
          <div style={styles.metricFooter}>100% score achievements rate</div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricTitle}>Execution Reliability</div>
          <div style={styles.metricValue}>
            {overview.gradedCodingAnswers > 0
              ? `${Math.round(
                  ((overview.gradedCodingAnswers -
                    overview.gradingFailedAnswers -
                    overview.providerUnavailableCount) /
                    overview.gradedCodingAnswers) *
                    100,
                )}%`
              : '100%'}
          </div>
          <div style={styles.metricFooter}>
            {overview.gradingFailedAnswers} failures • {overview.providerUnavailableCount}{' '}
            unavailable
          </div>
        </div>
      </div>

      {/* Distributions Row */}
      <div style={styles.distributionsRow}>
        {/* Language Usage */}
        <div style={styles.distributionCard}>
          <h3 style={styles.cardTitle}>Language Distribution</h3>
          {languageDistribution.length === 0 ? (
            <div style={styles.emptyCardState}>No submissions recorded.</div>
          ) : (
            <div style={styles.languagesList}>
              {languageDistribution.map((lang) => {
                const percent =
                  totalLanguagesCount > 0 ? (lang.count / totalLanguagesCount) * 100 : 0;
                const barColor = getLanguageColor(lang.language);
                return (
                  <div key={lang.language} style={styles.langItem}>
                    <div style={styles.langInfo}>
                      <span style={styles.langName}>{lang.displayName || lang.language}</span>
                      <span style={styles.langCount}>
                        {lang.count} ({Math.round(percent)}%)
                      </span>
                    </div>
                    <div style={styles.progressContainer}>
                      <div
                        style={{
                          ...styles.progressBar,
                          width: `${percent}%`,
                          backgroundColor: barColor,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Verdict breakdown */}
        <div style={styles.distributionCard}>
          <h3 style={styles.cardTitle}>Submission Verdicts</h3>
          {verdictDistribution.length === 0 ? (
            <div style={styles.emptyCardState}>No graded submissions recorded.</div>
          ) : (
            <div style={styles.verdictsList}>
              {verdictDistribution.map((item) => {
                const colors = getVerdictColor(item.verdict);
                return (
                  <div
                    key={item.verdict}
                    style={{
                      ...styles.verdictItem,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderColor: colors.border,
                    }}
                  >
                    <span style={styles.verdictLabel}>{item.verdict}</span>
                    <span style={styles.verdictCount}>{item.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Question Performance Table */}
      <div style={styles.tableCard}>
        <h3 style={styles.cardTitle}>Coding Question Performance</h3>
        <div style={styles.tableWrapper}>
          {questionPerformance.length === 0 ? (
            <div style={styles.emptyTableState}>
              No coding questions found in this assessment's active snapshot.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Question</th>
                  <th style={styles.th}>Graded Answers</th>
                  <th style={styles.th}>Avg. Score</th>
                  <th style={styles.th}>Pass Rate</th>
                  <th style={styles.th}>Public Tests</th>
                  <th style={styles.th}>Hidden Tests</th>
                  <th style={styles.th}>Pending Review</th>
                  <th style={styles.th}>Provider Errors</th>
                  <th style={styles.th}>Common Verdict</th>
                </tr>
              </thead>
              <tbody>
                {questionPerformance.map((q) => {
                  const colors = q.mostCommonVerdict ? getVerdictColor(q.mostCommonVerdict) : null;
                  return (
                    <tr key={q.questionId} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.questionTitle}>{q.title}</div>
                        <span style={styles.questionIdSub}>{q.questionId}</span>
                      </td>
                      <td style={styles.td}>{q.gradedAnswers}</td>
                      <td style={styles.td}>
                        <span style={styles.scoreText}>
                          {q.averageScorePercent !== null ? `${q.averageScorePercent}%` : 'N/A'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.scoreText}>
                          {q.passRatePercent !== null ? `${q.passRatePercent}%` : 'N/A'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.testBadge}>
                          {q.publicPassedCount} / {q.publicTotalCount}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.testBadge}>
                          {q.hiddenPassedCount} / {q.hiddenTotalCount}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {q.manualReviewCount > 0 ? (
                          <span style={styles.reviewBadge}>{q.manualReviewCount} pending</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td style={styles.td}>
                        {q.providerUnavailableCount > 0 ? (
                          <span style={styles.errorBadge}>{q.providerUnavailableCount} failed</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td style={styles.td}>
                        {q.mostCommonVerdict ? (
                          <span
                            style={{
                              ...styles.verdictBadge,
                              backgroundColor: colors?.bg,
                              color: colors?.text,
                              borderColor: colors?.border,
                            }}
                          >
                            {q.mostCommonVerdict}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
    display: 'grid',
    gap: '2rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(0, 0, 0, 0.1)',
    borderTopColor: 'hsl(212, 85%, 45%)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '0.95rem',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  errorCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '400px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  },
  errorTitle: {
    margin: '0 0 0.5rem',
    color: '#ef4444',
    fontSize: '1.25rem',
  },
  errorMessage: {
    color: '#64748b',
    margin: '0 0 1.5rem',
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  retryButton: {
    background: 'hsl(212, 85%, 45%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  headerPanel: {
    background: 'linear-gradient(135deg, hsl(210, 40%, 98%) 0%, hsl(210, 40%, 95%) 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: '24px',
    padding: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  },
  headerInfo: {
    display: 'grid',
    gap: '0.25rem',
  },
  eyebrow: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'hsl(212, 85%, 45%)',
    letterSpacing: '0.1em',
  },
  title: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
  headerActions: {},
  backButton: {
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '30px',
    padding: '0.6rem 1.25rem',
    color: '#334155',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.2s',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
  },
  metricCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '1.5rem',
    display: 'grid',
    gap: '0.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
  },
  metricTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  metricValue: {
    fontSize: '2.25rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  metricFooter: {
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
  distributionsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '1.5rem',
  },
  distributionCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '24px',
    padding: '1.5rem 2rem',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
  },
  cardTitle: {
    margin: '0 0 1.25rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  emptyCardState: {
    minHeight: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  languagesList: {
    display: 'grid',
    gap: '1.25rem',
  },
  langItem: {
    display: 'grid',
    gap: '0.35rem',
  },
  langInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
  },
  langName: {
    fontWeight: 600,
    color: '#334155',
  },
  langCount: {
    color: '#64748b',
  },
  progressContainer: {
    height: '8px',
    background: '#f1f5f9',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '4px',
  },
  verdictsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  verdictItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid transparent',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  verdictLabel: {
    letterSpacing: '0.02em',
  },
  verdictCount: {
    background: '#fff',
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  tableCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '24px',
    padding: '1.5rem 2rem',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
  },
  tableWrapper: {
    overflowX: 'auto' as const,
  },
  emptyTableState: {
    padding: '3rem',
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const,
  },
  th: {
    padding: '0.75rem 1rem',
    borderBottom: '2px solid #f1f5f9',
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '1rem',
    fontSize: '0.9rem',
    color: '#334155',
  },
  questionTitle: {
    fontWeight: 600,
    color: '#0f172a',
  },
  questionIdSub: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  scoreText: {
    fontWeight: 700,
    color: '#0f172a',
  },
  testBadge: {
    background: '#f1f5f9',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#475569',
  },
  reviewBadge: {
    background: 'hsla(38, 92%, 50%, 0.15)',
    color: 'hsl(38, 92%, 40%)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  errorBadge: {
    background: 'hsla(350, 80%, 50%, 0.12)',
    color: 'hsl(350, 80%, 42%)',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  verdictBadge: {
    padding: '0.25rem 0.6rem',
    borderRadius: '8px',
    border: '1px solid transparent',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
};
