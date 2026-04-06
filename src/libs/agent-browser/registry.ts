import type { CloseableBrowser } from './task.js';

export interface ActiveBrowserRegistry {
  readonly size: number;
  track(browser: CloseableBrowser): () => void;
  cleanup(): Promise<void>;
}

export function createActiveBrowserRegistry(): ActiveBrowserRegistry {
  const browsers = new Set<CloseableBrowser>();
  let cleanupPromise: Promise<void> | undefined;

  return {
    get size() {
      return browsers.size;
    },

    track(browser) {
      if (cleanupPromise) {
        void browser.close();
        return () => {};
      }

      browsers.add(browser);

      return () => {
        browsers.delete(browser);
      };
    },

    async cleanup() {
      if (!cleanupPromise) {
        cleanupPromise = (async () => {
          const activeBrowsers = [...browsers];
          browsers.clear();

          await Promise.allSettled(activeBrowsers.map(async (browser) => {
            await browser.close();
          }));
        })();
      }

      await cleanupPromise;
    },
  };
}

export const activeBrowserRegistry = createActiveBrowserRegistry();
