import { Button, Card } from '@mentrily/ui-system';

export function NotificationErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: (() => void) | undefined;
}) {
  return (
    <Card
      className="rounded-[2rem] border-rose-200 bg-rose-50/80"
      data-testid="notification-error-state"
    >
      <h3 className="text-lg font-semibold text-rose-900">Notification center unavailable</h3>
      <p className="mt-2 text-sm text-rose-700">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button onClick={onRetry} variant="secondary">
            Retry
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
