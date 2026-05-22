import { Badge, Button, Card } from '@mentrily/ui-system';
import type { NotificationInboxItem } from '../types';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusTone(status: NotificationInboxItem['status']) {
  if (status === 'ARCHIVED') {
    return 'neutral';
  }
  if (status === 'READ') {
    return 'success';
  }
  return 'info';
}

export function NotificationInboxItemCard({
  item,
  isPending,
  onArchive,
  onToggleRead,
}: {
  item: NotificationInboxItem;
  isPending: boolean;
  onArchive: (notificationId: string) => void;
  onToggleRead: (notificationId: string, nextRead: boolean) => void;
}) {
  return (
    <Card className="rounded-[2rem]" data-testid={`notification-item-${item.id}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(item.status)}>{item.status}</Badge>
            <Badge tone="neutral">{item.channel}</Badge>
            <Badge tone="neutral">{item.priority}</Badge>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              {item.subject ?? 'In-app notification'}
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.body}</p>
          </div>
          <div className="text-xs text-slate-500">
            <div>Created {formatDate(item.createdAt)}</div>
            {item.readAt ? <div>Read {formatDate(item.readAt)}</div> : null}
            {item.archivedAt ? <div>Archived {formatDate(item.archivedAt)}</div> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {item.status !== 'ARCHIVED' ? (
            <Button
              data-testid={`toggle-read-${item.id}`}
              disabled={isPending}
              onClick={() => onToggleRead(item.id, item.status !== 'UNREAD')}
              variant="secondary"
            >
              {item.status === 'UNREAD' ? 'Mark as read' : 'Mark as unread'}
            </Button>
          ) : null}
          {item.status !== 'ARCHIVED' ? (
            <Button
              data-testid={`archive-${item.id}`}
              disabled={isPending}
              onClick={() => onArchive(item.id)}
              variant="ghost"
            >
              Archive
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
