import { Card } from '@mentrily/ui-system';
import type { LearnerCourseDeliveryContract } from '../../types';

export function CourseAssessmentSummary({ delivery }: { delivery: LearnerCourseDeliveryContract }) {
  return (
    <Card className="space-y-3 rounded-[2rem]" data-testid="course-assessment-summary">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Assessment progress</h3>
        <p className="text-sm text-slate-600">
          {delivery.summary.completedRequiredAssessments} of {delivery.summary.requiredAssessments}{' '}
          required assessments complete.
        </p>
      </div>
      <p className="text-sm text-slate-700">
        {delivery.summary.canCompleteCourse
          ? 'Required assessment policy is satisfied for course completion.'
          : `${delivery.summary.blockedRequiredAssessments} required assessment${delivery.summary.blockedRequiredAssessments === 1 ? '' : 's'} still block course completion.`}
      </p>
    </Card>
  );
}
