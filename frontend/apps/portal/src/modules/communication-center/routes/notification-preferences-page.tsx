'use client';

import Link from 'next/link';
import { Button, Card } from '@mentrily/ui-system';
import {
  NotificationEmptyState,
  NotificationErrorState,
  NotificationPreferencesForm,
  NotificationSkeleton,
} from '../components';
import { useNotificationPreferences } from '../hooks';

export function NotificationPreferencesPage() {
  const { error, loading, preferences, refresh, savePreference, savingKey } =
    useNotificationPreferences();

  return (
    <div className="space-y-6" data-testid="notification-preferences-page">
      <Card className="rounded-[2rem]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workspace settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Notification preferences</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Save per-category channel preferences for your workspace account. These settings do
              not enable live email or SMS delivery.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void refresh()} variant="secondary">
              Refresh
            </Button>
            <Link
              className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
              href="/notifications"
            >
              Back to inbox
            </Link>
          </div>
        </div>
      </Card>

      {error ? <NotificationErrorState message={error} onRetry={() => void refresh()} /> : null}
      {loading ? <NotificationSkeleton /> : null}
      {!loading && !error && preferences.length === 0 ? (
        <NotificationEmptyState
          description="Preference rows will appear once the workspace preference matrix is available."
          title="No notification preferences found"
        />
      ) : null}
      {!loading && !error && preferences.length > 0 ? (
        <NotificationPreferencesForm
          onToggle={(preference, enabled) => void savePreference(preference, enabled)}
          preferences={preferences}
          savingKey={savingKey}
        />
      ) : null}
    </div>
  );
}
