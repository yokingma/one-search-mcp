export interface RequestSignalOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  timeoutMessage: string;
}

export interface RequestSignalController {
  signal?: AbortSignal;
  cleanup(): void;
}

export function createRequestSignal({
  signal,
  timeoutMs,
  timeoutMessage,
}: RequestSignalOptions): RequestSignalController {
  if (timeoutMs === undefined) {
    return {
      signal,
      cleanup: () => {},
    };
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error(timeoutMessage));
  }, timeoutMs);

  return {
    signal: signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
    },
  };
}
