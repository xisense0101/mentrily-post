import { Button, Card } from '@mentrily/ui-system';
import type { LearningCourseContract } from '../../types';

interface CoursePublishPanelProps {
  course: LearningCourseContract;
  onPublish: () => Promise<void> | void;
  isPublishing?: boolean;
}

export function CoursePublishPanel({
  course,
  onPublish,
  isPublishing = false,
}: CoursePublishPanelProps) {
  const lessonCount = course.sections.reduce(
    (count, section) => count + section.lessons.length,
    0,
  );
  const canPublish = course.sections.length > 0 && lessonCount > 0;

  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Publish readiness</h3>
          <p className="mt-1 text-sm text-slate-600">
            {canPublish
              ? 'This course has structure in place and can be published.'
              : 'Add at least one section and one lesson before publishing.'}
          </p>
        </div>
        <div data-testid="course-publish-button">
          <Button disabled={!canPublish || isPublishing} onClick={onPublish}>
            {isPublishing ? 'Publishing...' : 'Publish course'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
