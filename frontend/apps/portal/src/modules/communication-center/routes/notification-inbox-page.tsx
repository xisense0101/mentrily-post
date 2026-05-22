'use client';

import Link from 'next/link';
import { Button, Card, Select } from '@mentrily/ui-system';
import {
  NotificationErrorState,
  NotificationInboxList,
  NotificationSkeleton,
  NotificationUnreadBadge,
} from '../components';
import { useNotificationInbox } from '../hooks';
import type { NotificationInboxStatus } from '../types';

export function NotificationInboxPage() {
  const {
    archive,
    error,
    items,
    loading,
    markRead,
    markUnread,
    pendingId,
    refresh,
    setStatus,
    status,
    unreadCount,
  } = useNotificationInbox('ALL');

  const filters: Array<{ label: string; value: NotificationInboxStatus | 'ALL' }> = [
    { label: 'All notifications', value: 'ALL' },
    { label: 'Unread only', value: 'UNREAD' },
    { label: 'Read only', value: 'READ' },
    { label: 'Archived', value: 'ARCHIVED' },
  ];

  return (
    <div className="space-y-6" data-testid="notification-inbox-page">
      <Card className="rounded-[2rem]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              Communication center
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Notification inbox</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review in-app workspace notifications, track read state, and archive completed items
              without exposing provider configuration.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NotificationUnreadBadge unreadCount={unreadCount} />
            <Button onClick={() => void refresh()} variant="secondary">
              Refresh
            </Button>
            <Link
              className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
              href="/settings/notifications"
            >
              Notification preferences
            </Link>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="notification-status-filter"
            >
              Filter inbox
            </label>
            <Select
              id="notification-status-filter"
              onChange={(event) => setStatus(event.target.value as NotificationInboxStatus | 'ALL')}
              value={status}
            >
              {filters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {error ? <NotificationErrorState message={error} onRetry={() => void refresh()} /> : null}
      {loading ? <NotificationSkeleton /> : null}
      {!loading && !error ? (
        <NotificationInboxList
          items={items}
          onArchive={(notificationId) => void archive(notificationId)}
          onToggleRead={(notificationId, nextRead) =>
            void (nextRead ? markRead(notificationId) : markUnread(notificationId))
          }
          pendingId={pendingId}
        />
      ) : null}
    </div>
  );
}
