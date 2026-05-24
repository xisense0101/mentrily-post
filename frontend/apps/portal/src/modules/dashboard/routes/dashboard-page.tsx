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

  useEffect(() => {
    let active = true;

    async function load() {
      setState(initialState);

      try {
        const [summaryResponse, multiWorkspace] = await Promise.all([
          dashboardApiClient.getDashboardSummary(),
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
          Workspace-scoped activity, content, assessment, media, and campaign summary cards.
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            <SummaryCard label="Courses" value={state.summary.totalCourses} href="/learning" />
            <SummaryCard
              label="Published Courses"
              value={state.summary.totalPublishedCourses}
              href="/learning"
            />
            <SummaryCard
              label="Assessments"
              value={state.summary.totalAssessments}
              href="/assessments"
            />
            <SummaryCard
              label="Pending Grading"
              value={state.summary.pendingGradingCount}
              href="/grading/manual-review"
            />
            <SummaryCard
              label="Content Documents"
              value={state.summary.contentDocumentsCount}
              href="/content"
            />
            <SummaryCard
              label="Media Assets"
              value={state.summary.mediaAssetsCount}
              href="/media"
            />
            <SummaryCard label="Campaigns" value={state.summary.campaignsCount} href="/campaigns" />
            <SummaryCard
              label="Failed or Quarantined Media"
              value={state.summary.failedQuarantinedMediaCount}
              href="/media"
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
                      {workspace.workspaceName}: {workspace.summary.totalCourses} courses,{' '}
                      {workspace.summary.totalAssessments} assessments
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

function SummaryCard(props: { label: string; value: number; href: string }) {
  return (
    <Link
      href={props.href}
      style={{
        border: '1px solid #d7dfe6',
        borderRadius: '12px',
        padding: '1rem',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <p style={{ margin: 0, color: '#52606d' }}>{props.label}</p>
      <strong style={{ fontSize: '1.75rem' }}>{props.value}</strong>
    </Link>
  );
}
