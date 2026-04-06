import { describe, expect, it, vi } from 'vitest';
import { createActiveBrowserRegistry } from '../src/libs/agent-browser/registry.ts';

describe('createActiveBrowserRegistry', () => {
  it('closes every tracked browser and only closes each browser once', async () => {
    const registry = createActiveBrowserRegistry();
    const firstClose = vi.fn(async () => {});
    const secondClose = vi.fn(async () => {});

    const untrackFirst = registry.track({ close: firstClose });
    registry.track({ close: secondClose });

    untrackFirst();

    await registry.cleanup();
    await registry.cleanup();

    expect(firstClose).not.toHaveBeenCalled();
    expect(secondClose).toHaveBeenCalledTimes(1);
    expect(registry.size).toBe(0);
  });
});
