import { Button, ErrorState } from '@mentrily/ui-system';

interface LearningErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function LearningErrorState({
  title = 'Learning data is unavailable',
  message,
  onRetry,
}: LearningErrorStateProps) {
  return (
    <div data-testid="learning-error-state">
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
