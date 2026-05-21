import { Button, Card } from '@mentrily/ui-system';

interface CourseActionBarProps {
  onRefresh?: () => void;
  onArchive?: () => Promise<void> | void;
  isArchiving?: boolean;
}

export function CourseActionBar({
  onRefresh,
  onArchive,
  isArchiving = false,
}: CourseActionBarProps) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Course actions</h3>
        <p className="text-sm text-slate-600">
          Refresh the course view or archive a course when it is no longer active.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {onRefresh ? (
          <Button onClick={onRefresh} variant="secondary">
            Refresh
          </Button>
        ) : null}
        {onArchive ? (
          <Button disabled={isArchiving} onClick={onArchive} variant="danger">
            {isArchiving ? 'Archiving...' : 'Archive course'}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
