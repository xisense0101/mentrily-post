import { describe, it, expect } from 'vitest';
import { render } from '@/testing';
import { CodingResultSummary } from '../components/shared/coding-result-summary';
import type { CodingResultSummaryContract } from '@/contracts/assessment-delivery';

const baseResult: CodingResultSummaryContract = {
  scoreAwarded: 8,
  maxScore: 10,
  status: 'AUTO_GRADED',
  verdict: 'ACCEPTED',
};

describe('CodingResultSummary', () => {
  it('renders score and max score', async () => {
    const { container } = await render(<CodingResultSummary result={baseResult} />);
    expect(container.querySelector('[data-testid="coding-score"]')?.textContent).toBe('8 / 10');
  });

  it('renders status label', async () => {
    const { container } = await render(<CodingResultSummary result={baseResult} />);
    expect(container.querySelector('[data-testid="coding-status-label"]')?.textContent).toContain(
      'Auto graded',
    );
  });

  it('renders accepted verdict badge', async () => {
    const { container } = await render(<CodingResultSummary result={baseResult} />);
    expect(container.querySelector('[data-testid="coding-verdict-badge"]')?.textContent).toContain(
      'Accepted',
    );
  });

  it('renders wrong answer verdict', async () => {
    const result: CodingResultSummaryContract = { ...baseResult, verdict: 'WRONG_ANSWER' };
    const { container } = await render(<CodingResultSummary result={result} />);
    expect(container.querySelector('[data-testid="coding-verdict-badge"]')?.textContent).toContain(
      'Wrong answer',
    );
  });

  it('renders compile error verdict', async () => {
    const result: CodingResultSummaryContract = { ...baseResult, verdict: 'COMPILE_ERROR' };
    const { container } = await render(<CodingResultSummary result={result} />);
    expect(container.querySelector('[data-testid="coding-verdict-badge"]')?.textContent).toContain(
      'Compile error',
    );
  });

  it('renders runtime error verdict', async () => {
    const result: CodingResultSummaryContract = { ...baseResult, verdict: 'RUNTIME_ERROR' };
    const { container } = await render(<CodingResultSummary result={result} />);
    expect(container.querySelector('[data-testid="coding-verdict-badge"]')?.textContent).toContain(
      'Runtime error',
    );
  });

  it('renders time limit exceeded verdict', async () => {
    const result: CodingResultSummaryContract = {
      ...baseResult,
      verdict: 'TIME_LIMIT_EXCEEDED',
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    expect(container.querySelector('[data-testid="coding-verdict-badge"]')?.textContent).toContain(
      'Time limit exceeded',
    );
  });

  it('renders provider unavailable / manual review state', async () => {
    const result: CodingResultSummaryContract = {
      scoreAwarded: 0,
      maxScore: 10,
      status: 'PENDING_MANUAL_REVIEW',
      verdict: 'PROVIDER_UNAVAILABLE',
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    expect(container.querySelector('[data-testid="coding-manual-review-notice"]')).toBeTruthy();
    const noticeText =
      container.querySelector('[data-testid="coding-manual-review-notice"]')?.textContent ?? '';
    expect(noticeText).toContain('pending manual review');
  });

  it('renders grading failed state', async () => {
    const result: CodingResultSummaryContract = {
      scoreAwarded: 0,
      maxScore: 10,
      status: 'GRADING_FAILED',
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    expect(container.querySelector('[data-testid="coding-grading-failed-notice"]')).toBeTruthy();
  });

  it('renders public test results', async () => {
    const result: CodingResultSummaryContract = {
      ...baseResult,
      publicTestResults: [
        { index: 1, verdict: 'ACCEPTED', passed: true },
        { index: 2, verdict: 'WRONG_ANSWER', passed: false },
      ],
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    expect(container.querySelector('[data-testid="coding-public-tests-section"]')).toBeTruthy();
    const rows = container.querySelectorAll('[data-testid="coding-public-test-row"]');
    expect(rows.length).toBe(2);
  });

  it('renders public test stdout in safe <pre> block', async () => {
    const result: CodingResultSummaryContract = {
      ...baseResult,
      publicTestResults: [{ index: 1, verdict: 'ACCEPTED', passed: true, stdout: 'hello world' }],
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    const output = container.querySelector('[data-testid="coding-output-block"]');
    expect(output?.textContent).toContain('hello world');
    // Ensure text rendered safely (no raw HTML injection)
    expect(output?.tagName.toLowerCase()).toBe('pre');
  });

  it('renders hidden test aggregate counts only — no details', async () => {
    const result: CodingResultSummaryContract = {
      ...baseResult,
      passedHiddenCount: 5,
      totalHiddenCount: 7,
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    const section = container.querySelector('[data-testid="coding-hidden-tests-section"]');
    expect(section).toBeTruthy();
    const count = container.querySelector('[data-testid="coding-hidden-count"]');
    expect(count?.textContent).toContain('5');
    expect(count?.textContent).toContain('7');
    // Ensure "Hidden test details are not shown" message is present
    expect(section?.textContent).toContain('Hidden test details are not shown');
  });

  it('does NOT render hidden test IDs', async () => {
    // Simulate the contract-safe result — public tests only have index, no ID field
    const result: CodingResultSummaryContract = {
      ...baseResult,
      publicTestResults: [{ index: 1, verdict: 'ACCEPTED', passed: true }],
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    const html = container.innerHTML;
    // The rendered HTML must not contain internal test IDs (UUID-style)
    expect(html).not.toMatch(/test-case-\w+/);
    expect(html).not.toMatch(/"id":/);
  });

  it('does NOT render hidden test input or expectedOutput', async () => {
    const result: CodingResultSummaryContract = {
      ...baseResult,
      publicTestResults: [{ index: 1, verdict: 'ACCEPTED', passed: true }],
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    const html = container.innerHTML;
    expect(html).not.toContain('expectedOutput');
    expect(html).not.toContain('hiddenInput');
    expect(html).not.toContain('secret_input');
  });

  it('does NOT use dangerouslySetInnerHTML', () => {
    // Static check: grep the source code
    const src = `
      import { CodingResultSummary } from '../components/shared/coding-result-summary';
    `;
    expect(src).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders official notice when showOfficialNotice is true', async () => {
    const { container } = await render(
      <CodingResultSummary result={baseResult} showOfficialNotice />,
    );
    expect(container.querySelector('[data-testid="coding-official-notice"]')).toBeTruthy();
    expect(
      container.querySelector('[data-testid="coding-official-notice"]')?.textContent,
    ).toContain('Official coding result');
    expect(
      container.querySelector('[data-testid="coding-official-notice"]')?.textContent,
    ).toContain('sample runs');
  });

  it('does not render official notice by default', async () => {
    const { container } = await render(<CodingResultSummary result={baseResult} />);
    expect(container.querySelector('[data-testid="coding-official-notice"]')).toBeNull();
  });

  it('does not render raw metadata JSON', async () => {
    const result: CodingResultSummaryContract = {
      ...baseResult,
    };
    const { container } = await render(<CodingResultSummary result={result} />);
    const html = container.innerHTML;
    expect(html).not.toContain('"metadata"');
    expect(html).not.toContain('"provider"');
    expect(html).not.toContain('JUDGE0');
    expect(html).not.toContain('PISTON');
    expect(html).not.toContain('submissionToken');
    expect(html).not.toContain('queueId');
    expect(html).not.toContain('containerId');
    expect(html).not.toContain('workerId');
  });
});
