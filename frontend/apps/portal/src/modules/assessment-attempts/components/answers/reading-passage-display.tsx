interface ReadingPassageDisplayProps {
  title?: string | undefined;
  body?: string | undefined;
  sourceLabel?: string | undefined;
}

export function ReadingPassageDisplay({ title, body, sourceLabel }: ReadingPassageDisplayProps) {
  return (
    <section
      className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-5 text-sky-950"
      data-testid="reading-passage-display"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
        Reading passage
      </p>
      {title ? <h4 className="mt-3 text-lg font-semibold">{title}</h4> : null}
      <div className="mt-3 space-y-3 text-sm leading-7 text-sky-900">
        {body ? (
          body
            .split('\n')
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
            ))
        ) : (
          <p>This passage block has no body text yet.</p>
        )}
      </div>
      {sourceLabel ? (
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-sky-700">
          Source: {sourceLabel}
        </p>
      ) : null}
    </section>
  );
}
