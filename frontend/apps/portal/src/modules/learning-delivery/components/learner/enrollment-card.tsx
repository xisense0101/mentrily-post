import { Button, Card } from '@mentrily/ui-system';
import type { LearningEnrollmentContract } from '../../types';

interface EnrollmentCardProps {
  enrollment: LearningEnrollmentContract;
  onSelect?: () => void;
}

export function EnrollmentCard({ enrollment, onSelect }: EnrollmentCardProps) {
  return (
    <div data-testid="enrollment-card">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {`Course ${enrollment.courseId}`}
            </h3>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Course ID {enrollment.courseId}
            </p>
            <p className="text-sm text-slate-500">Enrollment {enrollment.id}</p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span>Status: {enrollment.status}</span>
              <span>Enrolled: {enrollment.enrolledAt}</span>
              {enrollment.completedAt ? <span>Completed: {enrollment.completedAt}</span> : null}
            </div>
          </div>
          {onSelect ? (
            <div data-testid="enrollment-select-button">
              <Button onClick={onSelect} variant="secondary">
                View outline
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
