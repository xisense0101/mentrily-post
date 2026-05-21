import type { AssessmentInstructorResultContract } from '../../types';
import { isResultReleased } from '../../state';
import { ReleaseResultButton } from './release-result-button';

export function InstructorResultActions({ result, releasing, onRelease }: { result: AssessmentInstructorResultContract; releasing: boolean; onRelease: () => Promise<void> | void }) {
  const disabled = isResultReleased(result) || result.gradingStatus === 'PENDING_MANUAL_REVIEW';
  return (
    <div className="flex items-center gap-3" data-testid="result-release-status">
      <ReleaseResultButton disabled={disabled} releasing={releasing} onRelease={onRelease} />
      <span className="text-sm text-portal-text-muted">{isResultReleased(result) ? 'Released' : result.gradingStatus === 'PENDING_MANUAL_REVIEW' ? 'Pending manual review' : 'Awaiting release'}</span>
    </div>
  );
}
