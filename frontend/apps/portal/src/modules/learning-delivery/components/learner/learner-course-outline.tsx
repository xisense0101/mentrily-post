import type {
  LearningCourseContract,
  LearningProgressContract,
} from '../../types';
import { LearningSectionList } from '../shared';
import { LessonProgressControl } from './lesson-progress-control';

interface LearnerCourseOutlineProps {
  course: LearningCourseContract;
  progressByLessonId?: Record<string, LearningProgressContract | undefined>;
  onProgressAction?: (
    lessonId: string,
    action: 'STARTED' | 'SEEN' | 'COMPLETED' | 'RESET',
  ) => Promise<void> | void;
  pendingLessonId?: string | null;
}

export function LearnerCourseOutline({
  course,
  progressByLessonId = {},
  onProgressAction,
  pendingLessonId,
}: LearnerCourseOutlineProps) {
  return (
    <LearningSectionList
      sections={course.sections}
      emptyMessage="This course does not contain lessons yet."
      lessonMeta={(lessonId) => {
        const progress = progressByLessonId[lessonId];

        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {progress?.status ?? 'NOT_STARTED'}
            </p>
            {onProgressAction ? (
              <LessonProgressControl
                isPending={pendingLessonId === lessonId}
                onProgressAction={(action) => onProgressAction(lessonId, action)}
                status={progress?.status}
              />
            ) : null}
          </div>
        );
      }}
    />
  );
}
