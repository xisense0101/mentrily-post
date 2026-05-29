import type {
  CodingResultSummaryContract,
  CodingVerdictContract,
} from '@/contracts/assessment-delivery';
import {
  getCodingVerdictLabel,
  getCodingGradeStatusLabel,
  isPendingManualReview,
  isGradingFailed,
} from '../../lib/coding-result-view-model';

/** Safe preformatted text block for stdout/stderr output */
function OutputBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-portal-text-muted">{label}</p>
      <pre
        className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all rounded-xl bg-portal-surface-muted p-3 text-xs text-portal-text"
        data-testid="coding-output-block"
      >
        {/* Text is rendered as text content — no HTML interpretation */}
        {text}
      </pre>
    </div>
  );
}

function verdictBgClass(verdict: CodingVerdictContract | string): string {
  if (verdict === 'ACCEPTED') return 'bg-emerald-100 text-emerald-800';
  if (verdict === 'WRONG_ANSWER') return 'bg-rose-100 text-rose-800';
  if (verdict === 'COMPILE_ERROR') return 'bg-orange-100 text-orange-800';
  if (
    verdict === 'RUNTIME_ERROR' ||
    verdict === 'TIME_LIMIT_EXCEEDED' ||
    verdict === 'MEMORY_LIMIT_EXCEEDED' ||
    verdict === 'OUTPUT_LIMIT_EXCEEDED'
  )
    return 'bg-amber-100 text-amber-800';
  if (verdict === 'PROVIDER_UNAVAILABLE') return 'bg-slate-100 text-slate-700';
  return 'bg-slate-100 text-slate-600';
}

/** Verdict badge with accessible Tailwind color classes */
function VerdictBadge({ verdict }: { verdict: string }) {
  const verdictLabel = getCodingVerdictLabel(verdict as CodingVerdictContract);
  const colorClass = verdictBgClass(verdict);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}
      data-testid="coding-verdict-badge"
    >
      {verdictLabel}
    </span>
  );
}

export interface CodingResultSummaryProps {
  result: CodingResultSummaryContract;
  /** If true, show the "official grading" notice to distinguish from sample runs */
  showOfficialNotice?: boolean;
}

/**
 * CodingResultSummary — safe coding result display component.
 *
 * Security guarantees:
 * - No dangerouslySetInnerHTML
 * - No eval / new Function
 * - No hidden test IDs, inputs, expected outputs, or stdout/stderr
 * - No provider internals, API keys, tokens, queue IDs, container IDs, worker IDs
 * - Output rendered via <pre> as plain text only
 * - Public test display index only (no internal ID)
 */
export function CodingResultSummary({
  result,
  showOfficialNotice = false,
}: CodingResultSummaryProps) {
  const isManualReview = isPendingManualReview(result.status);
  const isFailed = isGradingFailed(result.status);
  const statusLabel = getCodingGradeStatusLabel(result.status);

  return (
    <div className="space-y-4" data-testid="coding-result-summary">
      {/* Official grading notice */}
      {showOfficialNotice && (
        <div
          className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700"
          data-testid="coding-official-notice"
        >
          Official coding result — this score comes from official grading, not from your earlier
          sample runs.
        </div>
      )}

      {/* Score and status header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-portal-border bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-portal-text">
            Score:{' '}
            <span data-testid="coding-score">
              {result.scoreAwarded} / {result.maxScore}
            </span>
          </p>
          <p className="mt-1 text-xs text-portal-text-muted" data-testid="coding-status-label">
            {statusLabel}
          </p>
        </div>
        {result.verdict && <VerdictBadge verdict={result.verdict} />}
      </div>

      {/* Manual review / provider unavailable states */}
      {isManualReview && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          data-testid="coding-manual-review-notice"
        >
          <p className="font-semibold">This coding answer is pending manual review.</p>
          <p className="mt-1 text-xs">
            {result.verdict === 'PROVIDER_UNAVAILABLE'
              ? 'The execution provider was unavailable or the answer requires instructor review.'
              : 'Your submission is awaiting review by an instructor or grader.'}
          </p>
          {result.message && (
            <p className="mt-2 text-xs text-amber-700" data-testid="coding-review-message">
              {result.message}
            </p>
          )}
        </div>
      )}

      {/* Grading failed state */}
      {isFailed && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          data-testid="coding-grading-failed-notice"
        >
          <p className="font-semibold">Grading failed.</p>
          <p className="mt-1 text-xs">Please contact your instructor or administrator.</p>
        </div>
      )}

      {/* Public test results */}
      {result.publicTestResults && result.publicTestResults.length > 0 && (
        <div data-testid="coding-public-tests-section">
          <p className="mb-2 text-sm font-semibold text-portal-text">Public test results</p>
          <ol className="space-y-3">
            {result.publicTestResults.map((tr) => (
              <li
                key={tr.index}
                className="rounded-2xl border border-portal-border bg-white p-4"
                data-testid="coding-public-test-row"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-portal-text">Test {tr.index}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${tr.passed ? 'text-emerald-700' : 'text-rose-700'}`}
                      data-testid="coding-test-pass-status"
                    >
                      {tr.passed ? '✓ Passed' : '✗ Failed'}
                    </span>
                    <VerdictBadge verdict={tr.verdict} />
                  </div>
                </div>
                {/* stdout/stderr rendered as text-only <pre> blocks — no HTML interpretation */}
                {tr.stdout && (
                  <div className="mt-3">
                    <OutputBlock label="Standard output" text={tr.stdout} />
                  </div>
                )}
                {tr.stderr && (
                  <div className="mt-3">
                    <OutputBlock label="Standard error" text={tr.stderr} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Hidden test aggregate — counts only, no details */}
      {result.totalHiddenCount !== undefined && result.totalHiddenCount > 0 && (
        <div
          className="rounded-2xl border border-portal-border bg-portal-surface-muted px-4 py-3"
          data-testid="coding-hidden-tests-section"
        >
          <p className="text-sm font-semibold text-portal-text">
            Hidden tests:{' '}
            <span data-testid="coding-hidden-count">
              {result.passedHiddenCount ?? 0} / {result.totalHiddenCount} passed
            </span>
          </p>
          <p className="mt-1 text-xs text-portal-text-muted">Hidden test details are not shown.</p>
        </div>
      )}

      {/* Empty hidden test section (no hidden tests) */}
      {result.totalHiddenCount === 0 && (
        <div
          className="rounded-2xl border border-portal-border bg-portal-surface-muted px-4 py-3"
          data-testid="coding-no-hidden-tests"
        >
          <p className="text-xs text-portal-text-muted">No hidden tests for this question.</p>
        </div>
      )}
    </div>
  );
}
