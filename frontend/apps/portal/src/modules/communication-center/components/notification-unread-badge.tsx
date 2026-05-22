import { Badge } from '@mentrily/ui-system';

export function NotificationUnreadBadge({ unreadCount }: { unreadCount: number }) {
  return <Badge tone={unreadCount > 0 ? 'info' : 'neutral'}>{unreadCount} unread</Badge>;
}
