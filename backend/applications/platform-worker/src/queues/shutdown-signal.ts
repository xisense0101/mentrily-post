export interface ShutdownSignal {
  signal: AbortSignal;
  register(): void;
  abort(reason?: string): void;
  dispose(): void;
}

export function createShutdownSignal(signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']): ShutdownSignal {
  const controller = new AbortController();
  const handlers = new Map<NodeJS.Signals, () => void>();

  const register = (): void => {
    for (const signalName of signals) {
      const handler = (): void => controller.abort(signalName);
      handlers.set(signalName, handler);
      process.once(signalName, handler);
    }
  };

  const dispose = (): void => {
    for (const [signalName, handler] of handlers.entries()) {
      process.off(signalName, handler);
    }
    handlers.clear();
  };

  return {
    signal: controller.signal,
    register,
    abort(reason?: string): void {
      controller.abort(reason);
      dispose();
    },
    dispose,
  };
}
