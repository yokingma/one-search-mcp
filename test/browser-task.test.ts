import { describe, expect, it, vi } from 'vitest';
import { activeBrowserRegistry } from '../src/libs/agent-browser/registry.ts';
import { runBrowserTask } from '../src/libs/agent-browser/task.ts';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs = 50) {
  return await Promise.race([
    promise.then(
      (value) => ({ status: 'resolved' as const, value }),
      (reason) => ({ status: 'rejected' as const, reason }),
    ),
    new Promise<{ status: 'timeout' }>((resolve) => {
      setTimeout(() => resolve({ status: 'timeout' }), timeoutMs);
    }),
  ]);
}

describe('runBrowserTask', () => {
  it('does not start the task when the signal is already aborted', async () => {
    const controller = new AbortController();
    const abortError = new Error('Request aborted');
    const close = vi.fn(async () => {});
    const task = vi.fn(async () => 'done');

    controller.abort(abortError);

    await expect(runBrowserTask({
      browser: { close },
      signal: controller.signal,
      task,
    })).rejects.toBe(abortError);

    expect(task).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately when the running task is aborted', async () => {
    const controller = new AbortController();
    const abortError = new Error('Request aborted');
    const close = vi.fn(async () => {});
    const deferred = createDeferred<string>();

    const taskPromise = runBrowserTask({
      browser: { close },
      signal: controller.signal,
      task: async () => await deferred.promise,
    });

    controller.abort(abortError);

    const result = await settleWithin(taskPromise);
    expect(result).toEqual({
      status: 'rejected',
      reason: abortError,
    });
    expect(close).toHaveBeenCalledTimes(1);

    deferred.resolve('done');
    await Promise.resolve();
  });

  it('tracks the browser while the task is running and unregisters it afterwards', async () => {
    const close = vi.fn(async () => {});
    const deferred = createDeferred<string>();

    const taskPromise = runBrowserTask({
      browser: { close },
      task: () => deferred.promise,
    });

    expect(activeBrowserRegistry.size).toBe(1);

    deferred.resolve('done');
    await expect(taskPromise).resolves.toBe('done');

    expect(activeBrowserRegistry.size).toBe(0);
  });
});
