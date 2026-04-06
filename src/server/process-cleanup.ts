type ShutdownSignal = 'SIGINT' | 'SIGTERM';
type CleanupEvent = ShutdownSignal | 'beforeExit';

export interface ProcessCleanupTarget {
  once(event: CleanupEvent, listener: () => void): this;
  kill?(pid: number, signal: ShutdownSignal): void;
  pid?: number;
}

export function installProcessCleanupHandlers(
  processLike: ProcessCleanupTarget,
  cleanup: () => Promise<void>,
): void {
  let cleanupPromise: Promise<void> | undefined;

  const runCleanup = async () => {
    if (!cleanupPromise) {
      cleanupPromise = cleanup();
    }

    await cleanupPromise;
  };

  const installSignalHandler = (signal: ShutdownSignal) => {
    processLike.once(signal, () => {
      void runCleanup().finally(() => {
        if (typeof processLike.kill === 'function' && typeof processLike.pid === 'number') {
          processLike.kill(processLike.pid, signal);
        }
      });
    });
  };

  processLike.once('beforeExit', () => {
    void runCleanup();
  });

  installSignalHandler('SIGINT');
  installSignalHandler('SIGTERM');
}
