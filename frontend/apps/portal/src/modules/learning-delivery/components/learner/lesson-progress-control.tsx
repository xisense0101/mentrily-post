'use client';

import { Button } from '@mentrily/ui-system';
import type { LearningProgressAction, LearningProgressStatus } from '../../types';

interface LessonProgressControlProps {
  status?: LearningProgressStatus | undefined;
  isPending?: boolean;
  onProgressAction: (action: LearningProgressAction) => Promise<void> | void;
}

export function LessonProgressControl({
  status,
  isPending = false,
  onProgressAction,
}: LessonProgressControlProps) {
  const actions: LearningProgressAction[] = ['STARTED', 'SEEN', 'COMPLETED', 'RESET'];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <div
          data-testid={action === 'COMPLETED' ? 'lesson-progress-complete-button' : undefined}
          key={action}
        >
          <Button
            disabled={isPending}
            onClick={() => onProgressAction(action)}
            variant={action === 'COMPLETED' ? 'primary' : 'secondary'}
          >
            {status === 'COMPLETED' && action === 'COMPLETED'
              ? 'Completed'
              : action.replace('_', ' ')}
          </Button>
        </div>
      ))}
    </div>
  );
}
