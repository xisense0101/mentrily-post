import { Card } from '@mentrily/ui-system';
import type { LearningCourseContract } from '../../types';
import { CourseStatusBadge, LearningSectionList } from '../shared';

interface CourseDetailPanelProps {
  course: LearningCourseContract;
}

export function CourseDetailPanel({ course }: CourseDetailPanelProps) {
  return (
    <Card data-testid="course-detail-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-950">{course.title}</h2>
          <p className="text-sm text-slate-500">{course.slug}</p>
          {course.description ? (
            <p className="max-w-3xl text-sm text-slate-600">{course.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <CourseStatusBadge status={course.status} />
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {course.visibility}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <LearningSectionList
          sections={course.sections}
          emptyMessage="Add a section to start structuring this course."
        />
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Attach Content Studio document later.
      </div>
    </Card>
  );
}
