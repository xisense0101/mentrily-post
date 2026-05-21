import type { ReactNode } from 'react';

interface ContentPageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function ContentPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: ContentPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-portal-border bg-white/90 p-6 shadow-portal-sm backdrop-blur md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
