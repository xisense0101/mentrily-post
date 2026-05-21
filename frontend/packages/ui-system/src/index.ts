// @ts-expect-error ui-system currently resolves React from the portal workspace until package sharing is wired.
import * as ReactRuntime from '../../../apps/portal/node_modules/react/index.js';

type ClassValue = string | false | null | undefined;
type ReactChild =
  import('../../../apps/portal/node_modules/@types/react/index').ReactNode;
type ReactElementLike =
  import('../../../apps/portal/node_modules/@types/react/index').ReactElement;

const { createElement } = ReactRuntime;

interface BaseProps {
  children?: ReactChild | undefined;
  className?: string | undefined;
  'data-testid'?: string | undefined;
}

interface ClickableProps {
  disabled?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

interface ChangeEventLike<TElement> {
  target: TElement;
}

function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}

export interface ButtonProps extends BaseProps, ClickableProps {
  type?: 'button' | 'submit' | 'reset' | undefined;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | undefined;
}

export function Button({
  children,
  className,
  disabled,
  onClick,
  type = 'button',
  variant = 'primary',
  'data-testid': dataTestId,
}: ButtonProps): ReactElementLike {
  const variantClass =
    variant === 'primary'
      ? 'border border-transparent bg-slate-950 text-white hover:bg-slate-800'
      : variant === 'secondary'
        ? 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        : variant === 'danger'
          ? 'border border-rose-200 bg-rose-600 text-white hover:bg-rose-500'
          : 'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900';

  return createElement(
    'button',
    {
      className: cx(
        'inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition focus-visible:outline-none disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none',
        variantClass,
        className,
      ),
      disabled,
      onClick,
      type,
      'data-testid': dataTestId,
    },
    children,
  );
}

export type CardProps = BaseProps;

export function Card({
  children,
  className,
  'data-testid': dataTestId,
}: CardProps): ReactElementLike {
  return createElement(
    'div',
    {
      className: cx(
        'rounded-3xl border border-slate-200/90 bg-white/90 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.24)] backdrop-blur',
        className,
      ),
      'data-testid': dataTestId,
    },
    children,
  );
}

interface FieldProps {
  className?: string | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  name?: string | undefined;
  placeholder?: string | undefined;
  value?: string | undefined;
  'aria-label'?: string | undefined;
  'data-testid'?: string | undefined;
}

export interface InputProps extends FieldProps {
  autoComplete?: string | undefined;
  inputMode?:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search';
  onChange?: (event: ChangeEventLike<HTMLInputElement>) => void | undefined;
  type?: 'text' | 'email' | 'number' | 'search' | 'url' | undefined;
}

export function Input({
  className,
  disabled,
  id,
  inputMode,
  name,
  onChange,
  placeholder,
  value,
  autoComplete,
  type = 'text',
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}: InputProps): ReactElementLike {
  return createElement('input', {
    className: cx(
      'w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-500',
      className,
    ),
    disabled,
    id,
    inputMode,
    name,
    onChange,
    placeholder,
    value,
    autoComplete,
    type,
    'aria-label': ariaLabel,
    'data-testid': dataTestId,
  });
}

export interface TextareaProps extends FieldProps {
  onChange?: (event: ChangeEventLike<HTMLTextAreaElement>) => void | undefined;
  rows?: number | undefined;
}

export function Textarea({
  className,
  disabled,
  id,
  name,
  onChange,
  placeholder,
  value,
  rows = 5,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}: TextareaProps): ReactElementLike {
  return createElement('textarea', {
    className: cx(
      'min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-500',
      className,
    ),
    disabled,
    id,
    name,
    onChange,
    placeholder,
    rows,
    value,
    'aria-label': ariaLabel,
    'data-testid': dataTestId,
  });
}

export interface SelectProps extends BaseProps {
  disabled?: boolean | undefined;
  id?: string | undefined;
  name?: string | undefined;
  onChange?: (event: ChangeEventLike<HTMLSelectElement>) => void | undefined;
  value?: string | undefined;
}

export function Select({
  children,
  className,
  disabled,
  id,
  name,
  onChange,
  value,
  'data-testid': dataTestId,
}: SelectProps): ReactElementLike {
  return createElement(
    'select',
    {
      className: cx(
        'w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-500',
        className,
      ),
      disabled,
      id,
      name,
      onChange,
      value,
      'data-testid': dataTestId,
    },
    children,
  );
}

export interface BadgeProps extends BaseProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | undefined;
}

export function Badge({
  children,
  className,
  tone = 'neutral',
}: BadgeProps): ReactElementLike {
  const toneClass =
    tone === 'success'
      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'border border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'border border-rose-200 bg-rose-50 text-rose-700'
          : tone === 'info'
            ? 'border border-sky-200 bg-sky-50 text-sky-700'
            : 'border border-slate-200 bg-slate-50 text-slate-600';

  return createElement(
    'span',
    {
      className: cx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-[0.02em]',
        toneClass,
        className,
      ),
    },
    children,
  );
}

export interface SkeletonProps {
  className?: string | undefined;
}

export function Skeleton({ className }: SkeletonProps): ReactElementLike {
  return createElement('div', {
    'aria-hidden': true,
    className: cx(
      'animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100',
      className,
    ),
  });
}

export interface EmptyStateProps {
  action?: ReactChild | undefined;
  className?: string | undefined;
  description: string;
  title: string;
}

export function EmptyState({
  action,
  className,
  description,
  title,
}: EmptyStateProps): ReactElementLike {
  return createElement(
    'div',
    {
      className: cx(
        'rounded-3xl border border-dashed border-slate-300 bg-slate-50/90 p-8 text-center shadow-sm',
        className,
      ),
    },
    createElement('div', {
      className:
        'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg text-slate-500 shadow-sm',
      children: '·',
    }),
    createElement('h3', {
      className: 'text-lg font-semibold text-slate-900',
      children: title,
    }),
    createElement('p', {
      className: 'mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600',
      children: description,
    }),
    action
      ? createElement('div', {
          className: 'mt-5 flex justify-center',
          children: action,
        })
      : null,
  );
}

export interface ErrorStateProps {
  action?: ReactChild | undefined;
  className?: string | undefined;
  description: string;
  title: string;
}

export function ErrorState({
  action,
  className,
  description,
  title,
}: ErrorStateProps): ReactElementLike {
  return createElement(
    'div',
    {
      className: cx(
        'rounded-3xl border border-rose-200 bg-rose-50/95 p-8 text-center shadow-sm',
        className,
      ),
      role: 'alert',
    },
    createElement('div', {
      className:
        'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-rose-600 shadow-sm',
      children: '!',
    }),
    createElement('h3', {
      className: 'text-lg font-semibold text-rose-900',
      children: title,
    }),
    createElement('p', {
      className: 'mx-auto mt-2 max-w-md text-sm leading-6 text-rose-700',
      children: description,
    }),
    action
      ? createElement('div', {
          className: 'mt-5 flex justify-center',
          children: action,
        })
      : null,
  );
}
