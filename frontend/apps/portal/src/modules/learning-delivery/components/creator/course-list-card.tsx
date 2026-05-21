import { Card } from '@mentrily/ui-system';
import type { LearningCourseContract } from '../../types';
import { CourseStatusBadge } from '../shared';

interface CourseListCardProps {
  course: LearningCourseContract;
  href?: string;
  onOpen?: () => void;
}

export function CourseListCard({ course, href, onOpen }: CourseListCardProps) {
  const lessonCount = course.sections.reduce(
    (count, section) => count + section.lessons.length,
    0,
  );

  const content = (
    <div data-testid="course-list-card">
      <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{course.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{course.slug}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CourseStatusBadge status={course.status} />
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {course.visibility}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
          <p>{course.sections.length} sections</p>
          <p>{lessonCount} lessons</p>
          <p>{course.publishedAt ? `Published ${course.publishedAt}` : 'Unpublished'}</p>
        </div>
        {course.description ? (
          <p className="mt-4 line-clamp-2 text-sm text-slate-600">{course.description}</p>
        ) : null}
      </Card>
    </div>
  );

  if (href) {
    return (
      <a className="block" href={href} onClick={onOpen}>
        {content}
      </a>
    );
  }

  return <div onClick={onOpen}>{content}</div>;
}
