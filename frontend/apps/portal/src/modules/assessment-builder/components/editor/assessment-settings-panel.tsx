'use client';

import { Input, Select } from '@mentrily/ui-system';
import { useId } from 'react';
import type {
  AssessmentContract,
  AssessmentResultReleasePolicyContract,
  AssessmentVisibilityContract,
  UpdateAssessmentRequest,
} from '../../types';

interface AssessmentSettingsPanelProps {
  assessment: AssessmentContract;
  onUpdate?: ((input: UpdateAssessmentRequest) => void) | undefined;
  disabled?: boolean | undefined;
}

export function AssessmentSettingsPanel({
  assessment,
  onUpdate,
  disabled,
}: AssessmentSettingsPanelProps) {
  const visibilityId = useId();
  const timeLimitId = useId();
  const resultReleasePolicyId = useId();

  const attemptPolicy = assessment.attemptPolicy as {
    allowRetake?: boolean | undefined;
    maxAttempts?: number | undefined;
    shuffleQuestions?: boolean | undefined;
    shuffleOptions?: boolean | undefined;
  };

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-4"
      data-testid="assessment-settings-panel"
    >
      <h3 className="text-sm font-semibold text-slate-900">Settings</h3>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600" htmlFor={visibilityId}>
          Visibility
        </label>
        <Select
          disabled={disabled}
          id={visibilityId}
          onChange={(event) =>
            onUpdate?.({
              visibility: event.target.value as AssessmentVisibilityContract,
            })
          }
          value={assessment.visibility}
        >
          <option value="PRIVATE">Private</option>
          <option value="WORKSPACE">Workspace</option>
          <option value="PUBLIC_LINK">Public link</option>
          <option value="INVITE_ONLY">Invite only</option>
        </Select>
      </div>

      <div className="space-y-1" data-testid="assessment-time-limit-input">
        <label className="text-xs font-medium text-slate-600" htmlFor={timeLimitId}>
          Time limit (minutes, optional)
        </label>
        <Input
          disabled={disabled}
          id={timeLimitId}
          onChange={(event) => {
            const value = event.target.value;
            onUpdate?.({
              timeLimitMinutes: value ? Number(value) : null,
            });
          }}
          placeholder="No time limit"
          type="number"
          value={assessment.timeLimitMinutes != null ? String(assessment.timeLimitMinutes) : ''}
        />
      </div>

      <div className="space-y-1" data-testid="assessment-result-release-select">
        <label className="text-xs font-medium text-slate-600" htmlFor={resultReleasePolicyId}>
          Result release policy
        </label>
        <Select
          disabled={disabled}
          id={resultReleasePolicyId}
          onChange={(event) =>
            onUpdate?.({
              resultReleasePolicy: event.target.value as AssessmentResultReleasePolicyContract,
            })
          }
          value={assessment.resultReleasePolicy}
        >
          <option value="IMMEDIATE">Immediate</option>
          <option value="AFTER_DUE_DATE">After due date</option>
          <option value="AFTER_MANUAL_REVIEW">After manual review</option>
          <option value="MANUAL_RELEASE">Manual release</option>
        </Select>
      </div>

      <div className="space-y-2" data-testid="assessment-attempt-policy-panel">
        <p className="text-xs font-medium text-slate-600">Attempt policy</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              checked={attemptPolicy.allowRetake ?? false}
              className="cursor-pointer accent-slate-800"
              disabled={disabled}
              onChange={(event) =>
                onUpdate?.({
                  attemptPolicy: {
                    ...attemptPolicy,
                    allowRetake: event.target.checked,
                  },
                })
              }
              type="checkbox"
            />
            Allow retake
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              checked={attemptPolicy.shuffleQuestions ?? false}
              className="cursor-pointer accent-slate-800"
              disabled={disabled}
              onChange={(event) =>
                onUpdate?.({
                  attemptPolicy: {
                    ...attemptPolicy,
                    shuffleQuestions: event.target.checked,
                  },
                })
              }
              type="checkbox"
            />
            Shuffle questions
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              checked={attemptPolicy.shuffleOptions ?? false}
              className="cursor-pointer accent-slate-800"
              disabled={disabled}
              onChange={(event) =>
                onUpdate?.({
                  attemptPolicy: {
                    ...attemptPolicy,
                    shuffleOptions: event.target.checked,
                  },
                })
              }
              type="checkbox"
            />
            Shuffle options
          </label>
        </div>
      </div>
    </div>
  );
}
