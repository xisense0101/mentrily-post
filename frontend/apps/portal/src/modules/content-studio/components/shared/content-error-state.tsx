import { Button, ErrorState } from '@mentrily/ui-system';

interface ContentErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ContentErrorState({
  title = 'Content Studio data is unavailable',
  message,
  onRetry,
}: ContentErrorStateProps) {
  return (
    <div data-testid="content-error-state">
      <ErrorState
        title={title}
        description={message}
        action={
          onRetry ? (
            <Button onClick={onRetry} variant="secondary">
              Retry
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
