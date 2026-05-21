interface AssessmentPageHeaderProps {
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  actions?: React.ReactNode | undefined;
}

import React from 'react';

export function AssessmentPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: AssessmentPageHeaderProps) {
  return (
    <div
      className="portal-page-header flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
      data-testid="assessment-page-header"
    >
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-portal-text">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-portal-text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
