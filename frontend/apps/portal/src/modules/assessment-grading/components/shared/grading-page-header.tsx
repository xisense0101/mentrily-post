import type { ReactNode } from 'react';

interface GradingPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function GradingPageHeader({ title, description, actions }: GradingPageHeaderProps) {
  return (
    <header className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-portal-text-muted">Assessment grading</p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-portal-text">{title}</h1>
          <p className="mt-2 text-sm text-portal-text-muted">{description}</p>
        </div>
        {actions}
      </div>
    </header>
  );
}
