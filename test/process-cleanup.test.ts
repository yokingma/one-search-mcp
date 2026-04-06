import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { installProcessCleanupHandlers } from '../src/server/process-cleanup.ts';

describe('installProcessCleanupHandlers', () => {
  it('deduplicates cleanup when multiple shutdown hooks fire', async () => {
    const processLike = new EventEmitter();
    const cleanup = vi.fn(async () => {});

    installProcessCleanupHandlers(processLike, cleanup);

    processLike.emit('SIGTERM');
    processLike.emit('beforeExit');
    await Promise.resolve();
    await Promise.resolve();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
