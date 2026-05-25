'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  DashboardActivityItemContract,
  DashboardSummaryContract,
  MultiWorkspaceDashboardSummaryContract,
} from '@mentrily/domain-contracts';
import { dashboardApiClient } from '../api/dashboard-api-client';

interface DashboardState {
  summary: DashboardSummaryContract | null;
  recentActivity: DashboardActivityItemContract[];
  workspaces: MultiWorkspaceDashboardSummaryContract | null;
  loading: boolean;
  error: string | null;
  forbidden: boolean;
}

const initialState: DashboardState = {
  summary: null,
  recentActivity: [],
  workspaces: null,
  loading: true,
  error: null,
  forbidden: false,
};

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>(initialState);
  const learning = state.summary?.learning ?? emptyLearningMetrics;
  const assessment = state.summary?.assessment ?? emptyAssessmentMetrics;
  const content = state.summary?.content ?? emptyContentMetrics;
  const media = state.summary?.media ?? emptyMediaMetrics;
  const communication = state.summary?.communication ?? emptyCommunicationMetrics;
  const campaign = state.summary?.campaign ?? emptyCampaignMetrics;

  useEffect(() => {
    let active = true;

    async function load() {
      setState(initialState);

      try {
        const [summaryResponse, multiWorkspace] = await Promise.all([
          Promise.all([
            dashboardApiClient.getCreatorDashboardSummary(),
            dashboardApiClient.getCreatorDashboardActivity(),
          ]).then(([summary, recentActivity]) => ({ summary, recentActivity })),
          dashboardApiClient.getMultiWorkspaceDashboard().catch(() => null),
        ]);

        if (!active) {
          return;
        }

        setState({
          summary: summaryResponse.summary,
          recentActivity: summaryResponse.recentActivity,
          workspaces: multiWorkspace,
          loading: false,
          error: null,
          forbidden: false,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
        setState({
          ...initialState,
          loading: false,
          forbidden: /forbidden|denied|403/i.test(message),
          error: /forbidden|denied|403/i.test(message) ? null : message,
        });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (state.forbidden) {
    return (
      <section data-testid="dashboard-forbidden">
        <h2>Access denied</h2>
        <p>You do not have permission to view dashboard analytics for this workspace.</p>
      </section>
    );
  }

  return (
    <section data-testid="dashboard-page" style={{ display: 'grid', gap: '1.5rem' }}>
      <header style={{ display: 'grid', gap: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <p style={{ margin: 0, color: '#52606d' }}>
          Workspace-scoped creator metrics driven by normalized analytics-safe read models.
        </p>
      </header>

      {state.loading ? <p data-testid="dashboard-loading">Loading dashboard metrics...</p> : null}
      {state.error ? <p data-testid="dashboard-error">{state.error}</p> : null}

      {!state.loading && state.summary ? (
        <>
          <section
            data-testid="dashboard-summary-cards"
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <MetricPanel
              testId="dashboard-learning-card"
              href="/learning"
              title="Learning"
              metrics={[
                ['Courses', learning.totalCourses],
                ['Published', learning.publishedCourses],
                ['Active Enrollments', learning.activeEnrollments],
                ['Completions', learning.courseCompletions],
                ['Linked Assessments', learning.linkedAssessmentsCount],
              ]}
            />
            <MetricPanel
              testId="dashboard-assessment-card"
              href="/assessments"
              title="Assessment"
              metrics={[
                ['Assessments', assessment.totalAssessments],
                ['Published', assessment.publishedAssessments],
                ['Attempts Started', assessment.attemptsStarted],
                ['Submissions', assessment.submissions],
                ['Pending Grading', assessment.pendingGrading],
                ['Released Results', assessment.resultsReleased],
              ]}
            />
            <MetricPanel
              testId="dashboard-content-card"
              href="/content"
              title="Content"
              metrics={[
                ['Documents', content.totalDocuments],
                ['Published', content.publishedDocuments],
                ['Updated Recently', content.recentlyUpdatedDocuments],
              ]}
            />
            <MetricPanel
              testId="dashboard-media-card"
              href="/media"
              title="Media Health"
              metrics={[
                ['Assets', media.totalAssets],
                ['Processing Failed', media.processingFailed],
                ['Quarantined or Unsafe', media.quarantinedAssets],
              ]}
            />
            <MetricPanel
              testId="dashboard-communication-card"
              href="/notifications"
              title="Communication"
              metrics={[
                ['Intents', communication.notificationIntentsCreated],
                ['Delivered', communication.delivered],
                ['Failed', communication.failed],
                ['Pending', communication.pendingDelivery],
              ]}
            />
            <MetricPanel
              testId="dashboard-campaign-card"
              href="/campaigns"
              title="Campaigns"
              metrics={[
                ['Total', campaign.totalCampaigns],
                ['Draft', campaign.draftCampaigns],
                ['Scheduled', campaign.scheduledCampaigns],
                ['Archived', campaign.archivedCampaigns],
              ]}
            />
          </section>

          <section
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            }}
          >
            <div>
              <h2 style={{ marginTop: 0 }}>Recent Activity</h2>
              {state.recentActivity.length === 0 ? (
                <p data-testid="dashboard-empty-activity">No recent workspace activity yet.</p>
              ) : (
                <ul data-testid="dashboard-activity-list" style={{ paddingLeft: '1rem' }}>
                  {state.recentActivity.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong> {item.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 style={{ marginTop: 0 }}>Workspace Access</h2>
              {state.workspaces && state.workspaces.workspaces.length > 1 ? (
                <ul data-testid="dashboard-multi-workspace-list" style={{ paddingLeft: '1rem' }}>
                  {state.workspaces.workspaces.map((workspace) => (
                    <li key={workspace.workspaceId}>
                      {workspace.workspaceName}:{' '}
                      {workspace.summary.learning?.totalCourses ??
                        workspace.summary.totalCourses ??
                        0}{' '}
                      courses,{' '}
                      {workspace.summary.assessment?.totalAssessments ??
                        workspace.summary.totalAssessments ??
                        0}{' '}
                      assessments
                    </li>
                  ))}
                </ul>
              ) : (
                <p data-testid="dashboard-single-workspace">
                  This account currently has one active workspace context.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

const emptyLearningMetrics = {
  totalCourses: 0,
  publishedCourses: 0,
  activeEnrollments: 0,
  lessonCompletions: 0,
  courseCompletions: 0,
  linkedAssessmentsCount: 0,
  metrics: [],
};

const emptyAssessmentMetrics = {
  totalAssessments: 0,
  publishedAssessments: 0,
  attemptsStarted: 0,
  submissions: 0,
  pendingGrading: 0,
  resultsReleased: 0,
  metrics: [],
};

const emptyContentMetrics = {
  totalDocuments: 0,
  publishedDocuments: 0,
  recentlyUpdatedDocuments: 0,
  metrics: [],
};

const emptyMediaMetrics = {
  totalAssets: 0,
  processingFailed: 0,
  quarantinedAssets: 0,
  metrics: [],
};

const emptyCommunicationMetrics = {
  notificationIntentsCreated: 0,
  delivered: 0,
  failed: 0,
  pendingDelivery: 0,
  metrics: [],
};

const emptyCampaignMetrics = {
  totalCampaigns: 0,
  draftCampaigns: 0,
  scheduledCampaigns: 0,
  archivedCampaigns: 0,
  metrics: [],
};

function MetricPanel(props: {
  testId: string;
  title: string;
  href: string;
  metrics: Array<[string, number]>;
}) {
  return (
    <Link
      data-testid={props.testId}
      href={props.href}
      style={{
        border: '1px solid #d7dfe6',
        borderRadius: '12px',
        padding: '1rem',
        textDecoration: 'none',
        color: 'inherit',
        display: 'grid',
        gap: '0.75rem',
      }}
    >
      <div>
        <p style={{ margin: 0, color: '#52606d' }}>{props.title}</p>
      </div>
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '0.5rem 1rem',
          margin: 0,
        }}
      >
        {props.metrics.map(([label, value]) => (
          <div key={label}>
            <dt style={{ color: '#52606d', fontSize: '0.875rem' }}>{label}</dt>
            <dd style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{value}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}
