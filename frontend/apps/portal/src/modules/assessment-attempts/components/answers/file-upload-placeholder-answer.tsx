interface FileUploadPlaceholderAnswerProps {
  instructions: string;
  allowedFileCategories: string[];
  maxFiles?: number | undefined;
  maxFileSizeMb?: number | undefined;
}

export function FileUploadPlaceholderAnswer({
  instructions,
  allowedFileCategories,
  maxFiles,
  maxFileSizeMb,
}: FileUploadPlaceholderAnswerProps) {
  return (
    <div
      className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-950"
      data-testid="file-upload-placeholder-answer"
    >
      <p className="font-semibold">File upload is coming with Media Library</p>
      <p className="mt-2 leading-6 text-amber-900">
        {instructions ||
          'This assessment can describe file expectations, but real uploads are not enabled yet.'}
      </p>
      <div className="mt-4 space-y-1 text-xs uppercase tracking-[0.18em] text-amber-800">
        <p>Uploads are disabled in this release.</p>
        <p>
          Allowed categories:{' '}
          {allowedFileCategories.length > 0 ? allowedFileCategories.join(', ') : 'Not specified'}
        </p>
        <p>Max files: {typeof maxFiles === 'number' ? maxFiles : 'Not specified'}</p>
        <p>
          Max file size:{' '}
          {typeof maxFileSizeMb === 'number' ? `${maxFileSizeMb} MB` : 'Not specified'}
        </p>
      </div>
    </div>
  );
}
