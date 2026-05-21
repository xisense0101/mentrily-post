interface AttemptStartErrorStateProps {
  message: string;
}

export function AttemptStartErrorState({ message }: AttemptStartErrorStateProps) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
      {message}
    </div>
  );
}
