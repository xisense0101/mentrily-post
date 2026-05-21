export interface WorkerLoopOptions {
  intervalMs: number;
  signal?: AbortSignal;
  immediate?: boolean;
}

export interface WorkerLoopHandle {
  completion: Promise<void>;
  stop(): void;
}

export async function runWorkerOnce<T>(task: () => Promise<T>): Promise<T> {
  return task();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = (): void => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = (): void => {
      cleanup();
      resolve();
    };

    if (signal) {
      if (signal.aborted) {
        cleanup();
        resolve();
        return;
      }

      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export function startWorkerLoop(task: () => Promise<void>, options: WorkerLoopOptions): WorkerLoopHandle {
  const controller = options.signal ? null : new AbortController();
  const signal = options.signal ?? controller!.signal;

  const completion = (async () => {
    if (options.immediate !== false && !signal.aborted) {
      await task();
    }

    while (!signal.aborted) {
      await sleep(options.intervalMs, signal);
      if (signal.aborted) {
        break;
      }

      await task();
    }
  })();

  return {
    completion,
    stop(): void {
      controller?.abort();
    },
  };
}
