import { NotificationEmptyState } from './notification-empty-state';
import { NotificationInboxItemCard } from './notification-inbox-item-card';
import type { NotificationInboxItem } from '../types';

export function NotificationInboxList({
  items,
  pendingId,
  onArchive,
  onToggleRead,
}: {
  items: NotificationInboxItem[];
  pendingId: string | null;
  onArchive: (notificationId: string) => void;
  onToggleRead: (notificationId: string, nextRead: boolean) => void;
}) {
  if (items.length === 0) {
    return <NotificationEmptyState />;
  }

  return (
    <div className="grid gap-4" data-testid="notification-inbox-list">
      {items.map((item) => (
        <NotificationInboxItemCard
          item={item}
          isPending={pendingId === item.id}
          key={item.id}
          onArchive={onArchive}
          onToggleRead={onToggleRead}
        />
      ))}
    </div>
  );
}
