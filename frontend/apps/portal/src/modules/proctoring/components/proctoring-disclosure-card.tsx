'use client';

import type { ProctoringAttemptSummaryContract } from '@mentrily/domain-contracts';

export function ProctoringDisclosureCard({
  summary,
}: {
  summary: ProctoringAttemptSummaryContract;
}) {
  return (
    <section
      className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
      data-testid="proctoring-disclosure-card"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
        Monitoring disclosure
      </p>
      <h3 className="mt-2 text-lg font-semibold">{summary.disclosure.title}</h3>
      <p className="mt-2 leading-6">{summary.disclosure.message}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="font-medium">This can record</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {summary.disclosure.captures.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium">This does not record</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {summary.disclosure.doesNotCapture.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
