export interface StdioDisconnectTarget {
  once(event: 'close' | 'end', listener: () => void): this;
}

export function installStdioDisconnectCleanupHandlers(
  stdin: StdioDisconnectTarget,
  cleanup: () => Promise<void>,
  exitProcess: (code: number) => never | void,
): void {
  let cleanupPromise: Promise<void> | undefined;
  let exited = false;

  const finalize = (code: number) => {
    if (exited) {
      return;
    }

    exited = true;
    exitProcess(code);
  };

  const runCleanup = async () => {
    if (!cleanupPromise) {
      cleanupPromise = cleanup();
    }

    await cleanupPromise;
  };

  const handleDisconnect = () => {
    void runCleanup()
      .then(() => {
        finalize(0);
      })
      .catch(() => {
        finalize(1);
      });
  };

  stdin.once('end', handleDisconnect);
  stdin.once('close', handleDisconnect);
}
