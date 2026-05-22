import { Card } from '@mentrily/ui-system';

export function NotificationEmptyState({
  title = 'No notifications yet',
  description = 'In-app updates will appear here once notification intents are dispatched to your workspace account.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="rounded-[2rem] text-center" data-testid="notification-empty-state">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </Card>
  );
}
