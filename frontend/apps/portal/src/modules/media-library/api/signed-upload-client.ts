export async function uploadFileToSignedUrl(input: {
  file: File;
  uploadUrl: string;
  method: 'PUT';
  headers?: Record<string, string>;
  onProgress?: (progress: {
    loadedBytes: number;
    totalBytes: number;
    percent: number;
  }) => void;
  signal?: AbortSignal;
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    const abortHandler = () => {
      request.abort();
      reject(new DOMException('Upload aborted', 'AbortError'));
    };

    request.open(input.method, input.uploadUrl);
    Object.entries(input.headers ?? {}).forEach(([key, value]) => {
      request.setRequestHeader(key, value);
    });

    request.upload.onprogress = (event) => {
      const totalBytes = event.total || input.file.size;
      const loadedBytes = event.loaded;
      const percent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;
      input.onProgress?.({ loadedBytes, totalBytes, percent });
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(new Error(`Signed upload failed with status ${request.status}`));
    };

    request.onerror = () => reject(new Error('Signed upload failed'));
    request.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    if (input.signal) {
      if (input.signal.aborted) {
        abortHandler();
        return;
      }

      input.signal.addEventListener('abort', abortHandler, { once: true });
    }

    request.send(input.file);
  });
}
