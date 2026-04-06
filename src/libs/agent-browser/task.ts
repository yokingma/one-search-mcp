import { activeBrowserRegistry } from './registry.js';

export interface CloseableBrowser {
  close(): Promise<void>;
}

export interface BrowserTaskOptions<T> {
  browser: CloseableBrowser;
  signal?: AbortSignal;
  task: () => Promise<T>;
}

function createBrowserCleanup(
  browser: CloseableBrowser,
  untrackBrowser: () => void,
): () => Promise<void> {
  let cleanupPromise: Promise<void> | undefined;

  return async () => {
    if (!cleanupPromise) {
      cleanupPromise = (async () => {
        untrackBrowser();
        await browser.close();
      })();
    }

    await cleanupPromise;
  };
}

function getAbortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
}

export async function runBrowserTask<T>({
  browser,
  signal,
  task,
}: BrowserTaskOptions<T>): Promise<T> {
  const untrackBrowser = activeBrowserRegistry.track(browser);
  const closeBrowser = createBrowserCleanup(browser, untrackBrowser);

  if (signal?.aborted) {
    await closeBrowser();
    throw getAbortReason(signal);
  }

  let handleAbort: (() => void) | undefined;

  try {
    const taskPromise = task();

    if (!signal) {
      return await taskPromise;
    }

    const abortPromise = new Promise<never>((_, reject) => {
      handleAbort = () => {
        void closeBrowser();
        reject(getAbortReason(signal));
      };

      signal.addEventListener('abort', handleAbort, { once: true });
    });

    return await Promise.race([taskPromise, abortPromise]);
  } finally {
    if (handleAbort) {
      signal?.removeEventListener('abort', handleAbort);
    }

    await closeBrowser();
  }
}
