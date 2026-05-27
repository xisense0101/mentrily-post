'use client';

import { useState } from 'react';

const MAX_NOTE_LENGTH = 2000;

export function IncidentNoteForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setError('Note cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_NOTE_LENGTH) {
      setError(`Note must be ${MAX_NOTE_LENGTH.toLocaleString()} characters or fewer.`);
      return;
    }
    setError(null);
    onSubmit(trimmed);
    setNote('');
  }

  const remaining = MAX_NOTE_LENGTH - note.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="incident-note-form">
      <div>
        <label
          htmlFor="incident-note-input"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Add Review Note
        </label>
        <textarea
          id="incident-note-input"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (error) {
              setError(null);
            }
          }}
          rows={4}
          maxLength={MAX_NOTE_LENGTH + 1}
          disabled={submitting}
          placeholder="Add a review note (visible to teachers/creators only)..."
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
          data-testid="incident-note-input"
        />
        <p
          className={`mt-1 text-right text-xs ${remaining < 0 ? 'text-red-500' : 'text-slate-400'}`}
          data-testid="incident-note-char-count"
        >
          {remaining} characters remaining
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert" data-testid="incident-note-error">
          {error}
        </p>
      ) : null}
      <button
        id="btn-add-note"
        type="submit"
        disabled={submitting || note.trim().length === 0}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="btn-add-note"
      >
        {submitting ? 'Adding note…' : 'Add Note'}
      </button>
    </form>
  );
}
