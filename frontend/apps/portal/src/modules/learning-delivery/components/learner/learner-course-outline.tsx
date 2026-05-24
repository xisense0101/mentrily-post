import type { LearnerCourseDeliveryContract, LearningProgressContract } from '../../types';
import { LearningSectionList } from '../shared';
import { LearnerLinkedAssessmentCard } from './learner-linked-assessment-card';
import { LessonProgressControl } from './lesson-progress-control';

interface LearnerCourseOutlineProps {
  delivery: LearnerCourseDeliveryContract;
  progressByLessonId?: Record<string, LearningProgressContract | undefined>;
  onProgressAction?: (
    lessonId: string,
    action: 'STARTED' | 'SEEN' | 'COMPLETED' | 'RESET',
  ) => Promise<void> | void;
  pendingLessonId?: string | null;
}

export function LearnerCourseOutline({
  delivery,
  progressByLessonId = {},
  onProgressAction,
  pendingLessonId,
}: LearnerCourseOutlineProps) {
  return (
    <div className="space-y-4">
      {delivery.courseLinkedAssessments.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900">Course assessments</h4>
            <p className="text-sm text-slate-600">
              These assessments are attached at the course level.
            </p>
          </div>
          <div className="grid gap-3">
            {delivery.courseLinkedAssessments.map((assessment) => (
              <LearnerLinkedAssessmentCard assessment={assessment} key={assessment.id} />
            ))}
          </div>
        </section>
      ) : null}

      <LearningSectionList
        sections={delivery.sections}
        emptyMessage="This course does not contain lessons yet."
        lessonMeta={(lessonId) => {
          const progress = progressByLessonId[lessonId];
          const lesson = delivery.sections
            .flatMap((section) => section.lessons)
            .find((item) => item.id === lessonId);

          return (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {progress?.status ?? lesson?.progress?.status ?? 'NOT_STARTED'}
                </p>
                {onProgressAction ? (
                  <LessonProgressControl
                    isPending={pendingLessonId === lessonId}
                    onProgressAction={(action) => onProgressAction(lessonId, action)}
                    status={progress?.status ?? lesson?.progress?.status}
                  />
                ) : null}
              </div>
              {lesson?.linkedAssessments.length ? (
                <div className="grid gap-3 md:min-w-[22rem]">
                  {lesson.linkedAssessments.map((assessment) => (
                    <LearnerLinkedAssessmentCard assessment={assessment} key={assessment.id} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        }}
      />
    </div>
  );
}
